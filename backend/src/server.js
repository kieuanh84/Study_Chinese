import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import {
  createUser,
  findUserByGoogle,
  findUserByUsername,
  initializeStorage,
  updateGoogleUser,
} from './storage.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 3000)
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173',
  }),
)
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.post('/api/auth/register', async (request, response) => {
  try {
    const username = cleanText(request.body.username)
    const password = String(request.body.password || '')
    const googleAccount = cleanText(request.body.googleAccount).toLowerCase()

    if (!username || password.length < 6 || !googleAccount) {
      return response.status(400).json({
        message:
          'Tên đăng nhập, mật khẩu tối thiểu 6 ký tự và tài khoản Google là bắt buộc.',
      })
    }

    const existingUser =
      (await findUserByUsername(username)) ||
      (await findUserByGoogle(googleAccount, googleAccount))

    if (existingUser) {
      return response
        .status(409)
        .json({ message: 'Tên đăng nhập hoặc tài khoản Google đã tồn tại.' })
    }

    const user = await createUser({
      googleAccount,
      googleSub: null,
      id: crypto.randomUUID(),
      name: username,
      passwordHash: await bcrypt.hash(password, 12),
      picture: '',
      role: 'user',
      username,
    })

    response.status(201).json(toAuthResponse(user))
  } catch (error) {
    response.status(500).json({ message: error.message })
  }
})

app.post('/api/auth/login', async (request, response) => {
  try {
    const username = cleanText(request.body.username)
    const password = String(request.body.password || '')
    const user = await findUserByUsername(username)

    if (!user || !user.passwordHash) {
      return response.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu.' })
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      return response.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu.' })
    }

    response.json(toAuthResponse(user))
  } catch (error) {
    response.status(500).json({ message: error.message })
  }
})

app.post('/api/auth/google', async (request, response) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return response
        .status(500)
        .json({ message: 'Backend chưa cấu hình GOOGLE_CLIENT_ID.' })
    }

    const credential = String(request.body.credential || '')
    if (!credential) {
      return response.status(400).json({ message: 'Thiếu Google credential.' })
    }

    const ticket = await googleClient.verifyIdToken({
      audience: process.env.GOOGLE_CLIENT_ID,
      idToken: credential,
    })
    const payload = ticket.getPayload()

    if (!payload?.email) {
      return response.status(401).json({ message: 'Google credential không hợp lệ.' })
    }

    const profile = {
      googleAccount: payload.email.toLowerCase(),
      googleSub: payload.sub,
      name: payload.name || payload.email,
      picture: payload.picture || '',
      username: makeUsername(payload.email),
    }

    const existingUser = await findUserByGoogle(
      profile.googleAccount,
      profile.googleSub,
    )

    if (existingUser) {
      const updatedUser = await updateGoogleUser(existingUser, profile)
      return response.json(toAuthResponse(updatedUser))
    }

    const user = await createUser({
      googleAccount: profile.googleAccount,
      googleSub: profile.googleSub,
      id: crypto.randomUUID(),
      name: profile.name,
      passwordHash: null,
      picture: profile.picture,
      role: 'user',
      username: await makeUniqueUsername(profile.username),
    })

    response.status(201).json(toAuthResponse(user))
  } catch (error) {
    response.status(401).json({ message: error.message || 'Đăng nhập Google thất bại.' })
  }
})

initializeStorage()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend ready at http://localhost:${port}`)
    })
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

function cleanText(value) {
  return String(value || '').trim()
}

function makeUsername(email) {
  return email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '')
    .slice(0, 40)
}

async function makeUniqueUsername(baseUsername) {
  let username = baseUsername || `user_${crypto.randomUUID().slice(0, 8)}`
  let suffix = 1

  while (await findUserByUsername(username)) {
    suffix += 1
    username = `${baseUsername}${suffix}`
  }

  return username
}

function toAuthResponse(user) {
  const publicUser = {
    email: user.googleAccount || '',
    googleAccount: user.googleAccount || '',
    id: user.id,
    name: user.name,
    picture: user.picture || '',
    role: user.role || 'user',
    username: user.username,
  }

  return {
    token: jwt.sign(publicUser, process.env.JWT_SECRET || 'dev-secret', {
      expiresIn: '7d',
    }),
    user: publicUser,
  }
}
