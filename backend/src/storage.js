import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(__dirname, '..', 'data')
const usersFile = path.join(dataDir, 'users.json')

let pool

export async function initializeStorage() {
  if (process.env.DATABASE_URL) {
    pool = mysql.createPool(process.env.DATABASE_URL)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(120) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NULL,
        google_account VARCHAR(255) NULL UNIQUE,
        google_sub VARCHAR(255) NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        picture TEXT NULL,
        role VARCHAR(40) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    return
  }

  await fs.mkdir(dataDir, { recursive: true })
  try {
    await fs.access(usersFile)
  } catch {
    await fs.writeFile(usersFile, '[]\n')
  }
}

export async function findUserByUsername(username) {
  if (pool) {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [
      username,
    ])
    return rows[0] ? fromDbUser(rows[0]) : null
  }

  return getJsonUsers().then((users) =>
    users.find((user) => user.username === username) || null,
  )
}

export async function findUserByGoogle(googleAccount, googleSub) {
  if (pool) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE google_account = ? OR google_sub = ?',
      [googleAccount, googleSub],
    )
    return rows[0] ? fromDbUser(rows[0]) : null
  }

  return getJsonUsers().then(
    (users) =>
      users.find(
        (user) =>
          user.googleAccount === googleAccount || user.googleSub === googleSub,
      ) || null,
  )
}

export async function createUser(user) {
  if (pool) {
    await pool.query(
      `
        INSERT INTO users
          (id, username, password_hash, google_account, google_sub, name, picture, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user.id,
        user.username,
        user.passwordHash,
        user.googleAccount,
        user.googleSub,
        user.name,
        user.picture,
        user.role,
      ],
    )
    return user
  }

  const users = await getJsonUsers()
  users.push(user)
  await fs.writeFile(usersFile, `${JSON.stringify(users, null, 2)}\n`)
  return user
}

export async function updateGoogleUser(user, profile) {
  const nextUser = {
    ...user,
    googleAccount: profile.googleAccount || user.googleAccount,
    googleSub: profile.googleSub || user.googleSub,
    name: profile.name || user.name,
    picture: profile.picture || user.picture,
  }

  if (pool) {
    await pool.query(
      `
        UPDATE users
        SET google_account = ?, google_sub = ?, name = ?, picture = ?
        WHERE id = ?
      `,
      [
        nextUser.googleAccount,
        nextUser.googleSub,
        nextUser.name,
        nextUser.picture,
        nextUser.id,
      ],
    )
    return nextUser
  }

  const users = await getJsonUsers()
  const nextUsers = users.map((item) => (item.id === user.id ? nextUser : item))
  await fs.writeFile(usersFile, `${JSON.stringify(nextUsers, null, 2)}\n`)
  return nextUser
}

async function getJsonUsers() {
  try {
    return JSON.parse(await fs.readFile(usersFile, 'utf8'))
  } catch {
    return []
  }
}

function fromDbUser(row) {
  return {
    createdAt: row.created_at,
    googleAccount: row.google_account,
    googleSub: row.google_sub,
    id: row.id,
    name: row.name,
    passwordHash: row.password_hash,
    picture: row.picture,
    role: row.role,
    username: row.username,
  }
}
