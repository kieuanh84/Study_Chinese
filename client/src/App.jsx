import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  grammarLessons,
  hskLevels,
  placementQuestions,
  sampleVocabulary,
} from './data/learningData'

const pages = [
  { id: 'home', label: 'Trang chủ' },
  { id: 'search', label: 'Tìm kiếm' },
  { id: 'vocabulary', label: 'Từ vựng' },
  { id: 'grammar', label: 'Ngữ pháp' },
  { id: 'test', label: 'Test cấp độ' },
  { id: 'flashcards', label: 'Card học thuộc' },
  { id: 'writing', label: 'Luyện viết' },
]

const featureItems = [
  {
    title: 'Tìm kiếm nhanh',
    text: 'Tra chữ Hán, pinyin, Hán Việt, nghĩa và chủ đề trong toàn bộ HSK.',
  },
  {
    title: 'Từ vựng HSK 1-6',
    text: 'Học theo cấp độ, chủ đề, từ loại, Hán Việt và nghĩa song ngữ.',
  },
  {
    title: 'Ngữ pháp theo cấp',
    text: 'Ôn mẫu câu, cách dùng và ví dụ từ cơ bản đến nâng cao.',
  },
  {
    title: 'Test cấp độ',
    text: 'Làm bài kiểm tra nhanh để tự ước lượng trình độ hiện tại.',
  },
  {
    title: 'Card học thuộc',
    text: 'Lật card, tự kiểm tra nghĩa và đánh dấu các từ đã nhớ.',
  },
  {
    title: 'Luyện viết chữ',
    text: 'Viết trực tiếp trên khung luyện nét để ghi nhớ mặt chữ.',
  },
]

function App() {
  const [activeLevel, setActiveLevel] = useState('all')
  const [activeTopic, setActiveTopic] = useState('all')
  const [activePage, setActivePage] = useState('home')
  const [query, setQuery] = useState('')
  const [knownWords, setKnownWords] = useState([])
  const [flashIndex, setFlashIndex] = useState(0)
  const [showFlashAnswer, setShowFlashAnswer] = useState(false)
  const [testAnswers, setTestAnswers] = useState({})
  const [submittedTest, setSubmittedTest] = useState(false)
  const [vocabularyData, setVocabularyData] = useState(sampleVocabulary)
  const [vocabularyStatus, setVocabularyStatus] = useState('loading')
  const [authUser, setAuthUser] = useState(() => getStoredUser())
  const [authMode, setAuthMode] = useState(null)
  const activePageLabel =
    pages.find((page) => page.id === activePage)?.label || 'Trang chủ'

  const topics = useMemo(
    () => ['all', ...new Set(vocabularyData.map((word) => word.topic))],
    [vocabularyData],
  )

  const filteredWords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return vocabularyData.filter((word) => {
      const matchesLevel =
        activeLevel === 'all' || word.level === Number(activeLevel)
      const matchesTopic = activeTopic === 'all' || word.topic === activeTopic
      const matchesQuery =
        !normalizedQuery ||
        [
          word.hanzi,
          word.pinyin,
          word.hanViet,
          word.meaningVi,
          word.meaningZh,
          word.topic,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)

      return matchesLevel && matchesTopic && matchesQuery
    })
  }, [activeLevel, activeTopic, query, vocabularyData])

  const filteredGrammar = useMemo(
    () =>
      grammarLessons.filter(
        (lesson) => activeLevel === 'all' || lesson.level === Number(activeLevel),
      ),
    [activeLevel],
  )

  const flashCards = filteredWords.length > 0 ? filteredWords : vocabularyData
  const currentFlashCard = flashCards[flashIndex % flashCards.length]
  const writingWord = currentFlashCard
  const knownCount = knownWords.length
  const testScore = placementQuestions.reduce(
    (score, question) =>
      testAnswers[question.id] === question.answer ? score + 1 : score,
    0,
  )
  const suggestedLevel = getSuggestedLevel(testScore)

  const canAccessLearningPages = Boolean(authUser)

  useEffect(() => {
    let isMounted = true

    fetch('/data/hskVocabularyFull.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Không tải được dữ liệu HSK')
        }

        return response.json()
      })
      .then((words) => {
        if (!isMounted) return
        setVocabularyData(words)
        setVocabularyStatus('ready')
      })
      .catch(() => {
        if (!isMounted) return
        setVocabularyStatus('fallback')
      })

    return () => {
      isMounted = false
    }
  }, [])

  function handleAuthChange(nextUser) {
    setAuthUser(nextUser)
    if (!nextUser) {
      setActivePage('home')
    }
  }

  function selectLevel(level) {
    if (!authUser) {
      setAuthMode('login')
      return
    }

    setActiveLevel(level)
    setActivePage('vocabulary')
    resetFlashcard()
  }

  function changeLevel(level) {
    setActiveLevel(level)
    resetFlashcard()
  }

  function changeTopic(topic) {
    setActiveTopic(topic)
    resetFlashcard()
  }

  function changeQuery(value) {
    setQuery(value)
    resetFlashcard()
  }

  function resetFlashcard() {
    setFlashIndex(0)
    setShowFlashAnswer(false)
  }

  function toggleKnownWord(wordId) {
    setKnownWords((current) =>
      current.includes(wordId)
        ? current.filter((id) => id !== wordId)
        : [...current, wordId],
    )
  }

  function nextFlashCard() {
    setFlashIndex((current) => (current + 1) % flashCards.length)
    setShowFlashAnswer(false)
  }

  function previousFlashCard() {
    setFlashIndex((current) =>
      current === 0 ? flashCards.length - 1 : current - 1,
    )
    setShowFlashAnswer(false)
  }

  function answerQuestion(questionId, option) {
    setSubmittedTest(false)
    setTestAnswers((current) => ({ ...current, [questionId]: option }))
  }

  return (
    <div className="app-frame">
      <div className="sky-effects" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <Sidebar
        activePage={activePage}
        onAuthChange={handleAuthChange}
        onOpenAuth={setAuthMode}
        onNavigate={setActivePage}
        user={authUser}
      />

      <main className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              中文学习 <span aria-hidden="true">•</span> {activePageLabel}
            </p>
            <h1>Học tiếng Trung theo HSK</h1>
          </div>
          <div className="topbar-stats" aria-label="Thống kê học tập">
            <span>{vocabularyData.length} từ vựng</span>
            <span>{grammarLessons.length} điểm ngữ pháp</span>
            <span>{knownCount} từ đã thuộc</span>
            {vocabularyStatus === 'loading' && <span>Đang tải dữ liệu</span>}
            {vocabularyStatus === 'fallback' && <span>Dùng dữ liệu mẫu</span>}
          </div>
        </header>

        {activePage === 'home' && (
          <HomeView
            activeLevel={activeLevel}
            knownCount={knownCount}
            onOpenAuth={setAuthMode}
            onSelectLevel={selectLevel}
            user={authUser}
            vocabularyData={vocabularyData}
          />
        )}

        {canAccessLearningPages &&
          (activePage === 'search' || activePage === 'vocabulary') && (
          <section className="study-area">
            <FiltersPanel
              activeLevel={activeLevel}
              activeTopic={activeTopic}
              filteredCount={filteredWords.length}
              onLevelChange={changeLevel}
              onQueryChange={changeQuery}
              onTopicChange={changeTopic}
              query={query}
              topics={topics}
            />
            <VocabularyView
              key={`${activeLevel}-${activeTopic}-${query}`}
              knownWords={knownWords}
              onToggleKnown={toggleKnownWord}
              words={filteredWords}
            />
          </section>
        )}

        {canAccessLearningPages && activePage === 'flashcards' && (
          <section className="study-area">
            <FiltersPanel
              activeLevel={activeLevel}
              activeTopic={activeTopic}
              filteredCount={filteredWords.length}
              onLevelChange={changeLevel}
              onQueryChange={changeQuery}
              onTopicChange={changeTopic}
              query={query}
              topics={topics}
            />
            <FlashcardView
              card={currentFlashCard}
              currentIndex={flashIndex}
              isKnown={knownWords.includes(currentFlashCard.id)}
              onNext={nextFlashCard}
              onPrevious={previousFlashCard}
              onToggleKnown={toggleKnownWord}
              setShowAnswer={setShowFlashAnswer}
              showAnswer={showFlashAnswer}
              totalCards={flashCards.length}
            />
          </section>
        )}

        {canAccessLearningPages && activePage === 'grammar' && (
          <section className="study-area">
            <LevelFilter activeLevel={activeLevel} onLevelChange={changeLevel} />
            <GrammarView lessons={filteredGrammar} />
          </section>
        )}

        {canAccessLearningPages && activePage === 'test' && (
          <section className="study-area">
            <PlacementTestView
              answers={testAnswers}
              onAnswer={answerQuestion}
              onReset={() => {
                setTestAnswers({})
                setSubmittedTest(false)
              }}
              onSubmit={() => setSubmittedTest(true)}
              score={testScore}
              submitted={submittedTest}
              suggestedLevel={suggestedLevel}
            />
          </section>
        )}

        {canAccessLearningPages && activePage === 'writing' && (
          <section className="study-area">
            <FiltersPanel
              activeLevel={activeLevel}
              activeTopic={activeTopic}
              filteredCount={filteredWords.length}
              onLevelChange={changeLevel}
              onQueryChange={changeQuery}
              onTopicChange={changeTopic}
              query={query}
              topics={topics}
            />
            <WritingView word={writingWord} />
          </section>
        )}
      </main>

      {authMode && (
        <AuthDialog
          mode={authMode}
          onAuthChange={handleAuthChange}
          onClose={() => setAuthMode(null)}
          onSwitchMode={setAuthMode}
        />
      )}
    </div>
  )
}

function Sidebar({ activePage, onAuthChange, onNavigate, onOpenAuth, user }) {
  const visiblePages = user ? pages : pages.filter((page) => page.id === 'home')

  return (
    <aside className="sidebar" aria-label="Điều hướng chính">
      <div className="brand-block">
        <span className="brand-mark">中</span>
        <div>
          <strong>HSK Studio</strong>
          <small>Học tiếng Trung</small>
        </div>
      </div>

      <nav className="side-nav">
        {visiblePages.map((page) => (
          <button
            className={activePage === page.id ? 'is-active' : ''}
            key={page.id}
            onClick={() => onNavigate(page.id)}
            type="button"
          >
            {page.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-auth">
        {user ? (
          <GoogleAuthPanel onAuthChange={onAuthChange} user={user} />
        ) : (
          <section className="auth-card">
            <p>Đăng nhập để lưu tiến độ học và danh sách từ đã thuộc.</p>
            <div className="auth-actions">
              <button onClick={() => onOpenAuth('login')} type="button">
                Đăng nhập
              </button>
              <button onClick={() => onOpenAuth('register')} type="button">
                Đăng ký
              </button>
            </div>
          </section>
        )}
      </div>
    </aside>
  )
}

function AuthDialog({ mode, onAuthChange, onClose, onSwitchMode }) {
  const isRegistering = mode === 'register'
  const [form, setForm] = useState({
    googleAccount: '',
    password: '',
    username: '',
  })
  const [authError, setAuthError] = useState('')
  const [authStatus, setAuthStatus] = useState('idle')

  function updateField(field, value) {
    setAuthError('')
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submitAuth(event) {
    event.preventDefault()
    setAuthError('')
    setAuthStatus('submitting')

    try {
      const nextUser = isRegistering
        ? await registerAccount(form)
        : await loginAccount(form)

      localStorage.setItem('hskUser', JSON.stringify(nextUser))
      onAuthChange(nextUser)
      onClose()
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setAuthStatus('idle')
    }
  }

  return (
    <div className="auth-overlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className="auth-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="auth-dialog-head">
          <div>
            <p className="eyebrow">Tài khoản học tập</p>
            <h2>{isRegistering ? 'Đăng ký' : 'Đăng nhập'}</h2>
          </div>
          <button aria-label="Đóng" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <p>
          {isRegistering
            ? 'Tạo tài khoản với role người dùng để lưu tiến độ học vào hệ thống.'
            : 'Đăng nhập bằng tài khoản đã đăng ký hoặc tiếp tục bằng Google.'}
        </p>

        <form className="auth-form" onSubmit={submitAuth}>
          <label htmlFor="username">Tên đăng nhập</label>
          <input
            id="username"
            onChange={(event) => updateField('username', event.target.value)}
            placeholder="Nhập tên đăng nhập"
            required
            value={form.username}
          />

          <label htmlFor="password">Mật khẩu</label>
          <input
            id="password"
            minLength={6}
            onChange={(event) => updateField('password', event.target.value)}
            placeholder="Nhập mật khẩu"
            required
            type="password"
            value={form.password}
          />

          {isRegistering && (
            <>
              <label htmlFor="googleAccount">Tài khoản Google</label>
              <input
                id="googleAccount"
                onChange={(event) =>
                  updateField('googleAccount', event.target.value)
                }
                placeholder="name@gmail.com"
                required
                type="email"
                value={form.googleAccount}
              />
            </>
          )}

          <input name="role" type="hidden" value="user" />

          {authError && <p className="auth-error">{authError}</p>}

          <button disabled={authStatus === 'submitting'} type="submit">
            {authStatus === 'submitting'
              ? 'Đang xử lý...'
              : isRegistering
                ? 'Tạo tài khoản'
                : 'Đăng nhập'}
          </button>
        </form>

        <div className="auth-divider">hoặc</div>

        <GoogleAuthPanel
          mode={mode}
          onAuthChange={onAuthChange}
          onAuthenticated={onClose}
          user={null}
        />

        <div className="auth-switch">
          {isRegistering ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
          <button
            onClick={() => onSwitchMode(isRegistering ? 'login' : 'register')}
            type="button"
          >
            {isRegistering ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </div>
      </section>
    </div>
  )
}

function GoogleAuthPanel({ mode = 'login', onAuthChange, onAuthenticated, user }) {
  const googleButtonRef = useRef(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const [googleStatus, setGoogleStatus] = useState('idle')

  useEffect(() => {
    if (!clientId || user) return undefined

    let isMounted = true

    loadGoogleIdentityScript()
      .then(() => {
        if (!isMounted || !window.google || !googleButtonRef.current) return

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              const profile = parseGoogleCredential(response.credential)
              if (!profile) return

              const nextUser = await saveGoogleUser(profile, response.credential)

              localStorage.setItem('hskUser', JSON.stringify(nextUser))
              onAuthChange(nextUser)
              onAuthenticated?.()
            } catch {
              setGoogleStatus('failed')
            }
          },
        })

        window.google.accounts.id.renderButton(googleButtonRef.current, {
          shape: 'rectangular',
          size: 'large',
          text: mode === 'register' ? 'signup_with' : 'signin_with',
          theme: 'outline',
          width: 220,
        })
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [clientId, mode, onAuthChange, onAuthenticated, user])

  function signOut() {
    localStorage.removeItem('hskUser')
    localStorage.removeItem('hskToken')
    window.google?.accounts?.id?.disableAutoSelect()
    onAuthChange(null)
  }

  if (user) {
    return (
      <section className="auth-card">
        <div className="user-row">
          {user.picture ? <img src={user.picture} alt="" /> : <span />}
          <div>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
        </div>
        <button onClick={signOut} type="button">
          Đăng xuất
        </button>
      </section>
    )
  }

  return (
    <section className="auth-card">
      {clientId && <div className="google-button" ref={googleButtonRef} />}
      {!clientId && (
        <p className="auth-note">Google OAuth chưa được bật trên môi trường này.</p>
      )}
      {googleStatus === 'unavailable' && (
        <p className="auth-note">Google OAuth chưa được bật trên môi trường này.</p>
      )}
      {googleStatus === 'failed' && (
        <p className="auth-error">Không thể đăng nhập Google lúc này.</p>
      )}
    </section>
  )
}

function HomeView({
  activeLevel,
  knownCount,
  onOpenAuth,
  onSelectLevel,
  user,
  vocabularyData,
}) {
  return (
    <>
      <section className="home-panel">
        <div>
          <p className="eyebrow">Trang chủ</p>
          <h2>{user ? `Chào ${user.name}` : 'Bắt đầu lộ trình HSK của bạn'}</h2>
          <p>
            Chọn một cấp HSK để học từ vựng, luyện card ghi nhớ, xem ngữ pháp,
            làm test trình độ và luyện viết chữ.
          </p>
          {!user && (
            <div className="home-actions">
              <button onClick={() => onOpenAuth('register')} type="button">
                Đăng ký
              </button>
              <button onClick={() => onOpenAuth('login')} type="button">
                Đăng nhập
              </button>
            </div>
          )}
        </div>
        <div className="home-metric">
          <strong>{knownCount}</strong>
          <span>từ đã đánh dấu thuộc</span>
        </div>
      </section>

      <section className="feature-grid" aria-label="Tính năng cơ bản">
        {featureItems.map((feature) => (
          <article className="feature-card" key={feature.title}>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </article>
        ))}
      </section>

      <section className="overview-grid" aria-label="Chọn cấp độ HSK">
        {hskLevels.map((level) => {
          const wordsInLevel = vocabularyData.filter(
            (word) => word.level === level.level,
          ).length

          return (
            <button
              className={`level-card ${
                activeLevel === level.level ? 'is-active' : ''
              }`}
              key={level.level}
              onClick={() => onSelectLevel(level.level)}
              style={{ '--level-tone': level.tone }}
              type="button"
            >
              <span>{level.title}</span>
              <strong>{wordsInLevel}</strong>
              <small>{level.target}</small>
            </button>
          )
        })}
      </section>
    </>
  )
}

function FiltersPanel({
  activeLevel,
  activeTopic,
  filteredCount,
  onLevelChange,
  onQueryChange,
  onTopicChange,
  query,
  topics,
}) {
  return (
    <section className="filters-panel" aria-label="Bộ lọc học tập">
      <div className="panel-section">
        <label htmlFor="search">Tìm nhanh</label>
        <input
          id="search"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Nhập chữ Hán, pinyin, nghĩa..."
          type="search"
          value={query}
        />
      </div>

      <LevelFilter activeLevel={activeLevel} onLevelChange={onLevelChange} />

      <div className="panel-section">
        <label htmlFor="topic">Chủ đề</label>
        <select
          id="topic"
          onChange={(event) => onTopicChange(event.target.value)}
          value={activeTopic}
        >
          {topics.map((topic) => (
            <option key={topic} value={topic}>
              {topic === 'all' ? 'Tất cả chủ đề' : topic}
            </option>
          ))}
        </select>
      </div>

      <div className="study-summary">
        <strong>{filteredCount}</strong>
        <span>từ đang hiển thị</span>
      </div>
    </section>
  )
}

function LevelFilter({ activeLevel, onLevelChange }) {
  return (
    <div className="panel-section">
      <span className="field-label">Cấp độ</span>
      <div className="segmented">
        <button
          className={activeLevel === 'all' ? 'is-active' : ''}
          onClick={() => onLevelChange('all')}
          type="button"
        >
          Tất cả
        </button>
        {hskLevels.map((level) => (
          <button
            className={activeLevel === level.level ? 'is-active' : ''}
            key={level.level}
            onClick={() => onLevelChange(level.level)}
            type="button"
          >
            {level.level}
          </button>
        ))}
      </div>
    </div>
  )
}

function VocabularyView({ knownWords, onToggleKnown, words }) {
  const [visibleCount, setVisibleCount] = useState(120)
  const visibleWords = words.slice(0, visibleCount)

  if (words.length === 0) {
    return (
      <div className="empty-state">
        <h2>Không có từ phù hợp</h2>
        <p>Thử đổi cấp độ, chủ đề hoặc từ khóa tìm kiếm.</p>
      </div>
    )
  }

  return (
    <>
      <div className="word-grid">
        {visibleWords.map((word) => (
          <article className="word-card" key={word.id}>
            <div className="word-card-head">
              <span className="badge">HSK {word.level}</span>
              <button
                className={
                  knownWords.includes(word.id) ? 'small is-active' : 'small'
                }
                onClick={() => onToggleKnown(word.id)}
                type="button"
              >
                {knownWords.includes(word.id) ? 'Đã thuộc' : 'Đánh dấu'}
              </button>
            </div>
            <div className="hanzi">{word.hanzi}</div>
            <p className="pinyin">{word.pinyin}</p>
            <dl className="word-details">
              <div>
                <dt>Từ loại</dt>
                <dd>{word.pos}</dd>
              </div>
              <div>
                <dt>Hán Việt</dt>
                <dd>{word.hanViet}</dd>
              </div>
              <div>
                <dt>Chủ đề</dt>
                <dd>{word.topic}</dd>
              </div>
            </dl>
            <div className="meaning-block">
              <strong>{word.meaningVi}</strong>
              <span>{word.meaningZh}</span>
            </div>
            {word.exampleZh && (
              <p className="example">
                <span>{word.exampleZh}</span>
                {word.exampleVi}
              </p>
            )}
          </article>
        ))}
      </div>

      {visibleCount < words.length && (
        <div className="load-more">
          <button
            onClick={() => setVisibleCount((current) => current + 120)}
            type="button"
          >
            Tải thêm từ ({visibleCount}/{words.length})
          </button>
        </div>
      )}
    </>
  )
}

function FlashcardView({
  card,
  currentIndex,
  isKnown,
  onNext,
  onPrevious,
  onToggleKnown,
  setShowAnswer,
  showAnswer,
  totalCards,
}) {
  return (
    <div className="flashcard-view">
      <button
        aria-label={showAnswer ? 'Ẩn nghĩa của card' : 'Lật card để xem nghĩa'}
        aria-pressed={showAnswer}
        className={`flashcard flashcard-flipper ${showAnswer ? 'is-flipped' : ''}`}
        onClick={() => setShowAnswer((current) => !current)}
        type="button"
      >
        <div className="flashcard-inner">
          <div className="flashcard-face flashcard-front">
            <div className="flashcard-meta">
              <span>HSK {card.level}</span>
              <span>
                {currentIndex + 1}/{totalCards}
              </span>
            </div>
            <div className="flash-hanzi">{card.hanzi}</div>
            <p>{card.pinyin}</p>
          </div>
          <div className="flashcard-face flashcard-back">
            <div className="flashcard-meta">
              <span>HSK {card.level}</span>
              <span>{card.hanzi}</span>
            </div>
            <div className="flash-answer">
              <strong>{card.meaningVi}</strong>
              <span>Từ loại: {card.pos}</span>
              <span>Hán Việt: {card.hanViet}</span>
              {card.meaningZh && <p>{card.meaningZh}</p>}
              {card.exampleZh && <p>{card.exampleZh}</p>}
              {card.exampleVi && <small>{card.exampleVi}</small>}
            </div>
          </div>
        </div>
      </button>
      <div className="flash-actions">
        <button onClick={onPrevious} type="button">
          Trước
        </button>
        <button onClick={onNext} type="button">
          Tiếp
        </button>
        <button
          className={isKnown ? 'is-active' : ''}
          onClick={() => onToggleKnown(card.id)}
          type="button"
        >
          {isKnown ? 'Đã thuộc' : 'Thuộc từ này'}
        </button>
      </div>
    </div>
  )
}

function GrammarView({ lessons }) {
  return (
    <div className="grammar-list">
      {lessons.map((lesson) => (
        <article className="grammar-card" key={`${lesson.level}-${lesson.title}`}>
          <span className="badge">HSK {lesson.level}</span>
          <h2>{lesson.title}</h2>
          <code>{lesson.pattern}</code>
          <p>{lesson.explain}</p>
          <div className="grammar-example">
            <strong>{lesson.exampleZh}</strong>
            <span>{lesson.exampleVi}</span>
          </div>
        </article>
      ))}
    </div>
  )
}

function PlacementTestView({
  answers,
  onAnswer,
  onReset,
  onSubmit,
  score,
  submitted,
  suggestedLevel,
}) {
  return (
    <div className="test-view">
      <div className="test-header">
        <div>
          <h2>Kiểm tra trình độ nhanh</h2>
          <p>Chọn đáp án để hệ thống gợi ý cấp HSK nên học tiếp.</p>
        </div>
        {submitted && (
          <div className="score-box">
            <strong>
              {score}/{placementQuestions.length}
            </strong>
            <span>{suggestedLevel}</span>
          </div>
        )}
      </div>

      <div className="question-list">
        {placementQuestions.map((question, index) => (
          <article className="question-card" key={question.id}>
            <span className="badge">HSK {question.level}</span>
            <h3>
              {index + 1}. {question.prompt}
            </h3>
            <div className="option-grid">
              {question.options.map((option) => {
                const isSelected = answers[question.id] === option
                const isCorrect = submitted && question.answer === option
                const isWrong = submitted && isSelected && question.answer !== option

                return (
                  <button
                    className={`${isSelected ? 'is-selected' : ''} ${
                      isCorrect ? 'is-correct' : ''
                    } ${isWrong ? 'is-wrong' : ''}`}
                    key={option}
                    onClick={() => onAnswer(question.id, option)}
                    type="button"
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </article>
        ))}
      </div>

      <div className="test-actions">
        <button
          disabled={Object.keys(answers).length !== placementQuestions.length}
          onClick={onSubmit}
          type="button"
        >
          Xem kết quả
        </button>
        <button onClick={onReset} type="button">
          Làm lại
        </button>
      </div>
    </div>
  )
}

function WritingView({ word }) {
  const canvasRef = useRef(null)
  const isDrawing = useRef(false)

  useEffect(() => {
    prepareCanvas(canvasRef.current)
  }, [word.id])

  function getPoint(event) {
    const rect = event.currentTarget.getBoundingClientRect()

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  function startDrawing(event) {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const point = getPoint(event)

    isDrawing.current = true
    context.beginPath()
    context.moveTo(point.x, point.y)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function draw(event) {
    if (!isDrawing.current) return

    const context = canvasRef.current.getContext('2d')
    const point = getPoint(event)

    context.lineTo(point.x, point.y)
    context.stroke()
  }

  function stopDrawing(event) {
    isDrawing.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <div className="writing-view">
      <div className="writing-target">
        <span className="badge">HSK {word.level}</span>
        <strong>{word.hanzi}</strong>
        <p>{word.pinyin}</p>
        <span>{word.meaningVi}</span>
      </div>

      <div className="writing-pad">
        <canvas
          aria-label={`Tập viết chữ ${word.hanzi}`}
          onPointerDown={startDrawing}
          onPointerLeave={stopDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          ref={canvasRef}
        />
        <button onClick={() => prepareCanvas(canvasRef.current)} type="button">
          Xóa nét
        </button>
      </div>
    </div>
  )
}

function prepareCanvas(canvas) {
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const ratio = window.devicePixelRatio || 1
  const context = canvas.getContext('2d')

  canvas.width = rect.width * ratio
  canvas.height = rect.height * ratio
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, rect.width, rect.height)
  context.lineWidth = 8
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.strokeStyle = '#111827'
}

function getSuggestedLevel(score) {
  if (score <= 2) return 'Gợi ý: bắt đầu từ HSK 1'
  if (score <= 4) return 'Gợi ý: học chắc HSK 2-3'
  if (score <= 6) return 'Gợi ý: thử HSK 4-5'
  return 'Gợi ý: bạn có thể luyện HSK 6'
}

function getStoredUser() {
  try {
    const rawUser = localStorage.getItem('hskUser')
    return rawUser ? JSON.parse(rawUser) : null
  } catch {
    return null
  }
}

async function registerAccount(form) {
  const account = {
    googleAccount: form.googleAccount.trim(),
    password: form.password,
    role: 'user',
    username: form.username.trim(),
  }

  if (!account.username || !account.password || !account.googleAccount) {
    throw new Error('Vui lòng nhập đủ tên đăng nhập, mật khẩu và tài khoản Google.')
  }

  const apiUser = await sendAuthRequest('/auth/register', account)
  if (apiUser) return toPublicUser(normalizeUser(apiUser, account))

  const users = getLocalUsers()
  const existedUser = users.find(
    (user) =>
      user.username === account.username ||
      user.googleAccount === account.googleAccount,
  )

  if (existedUser) {
    throw new Error('Tên đăng nhập hoặc tài khoản Google đã tồn tại.')
  }

  const nextUser = normalizeUser(account)
  localStorage.setItem('hskUsers', JSON.stringify([...users, nextUser]))

  return toPublicUser(nextUser)
}

async function loginAccount(form) {
  const account = {
    googleAccount: form.googleAccount.trim(),
    password: form.password,
    username: form.username.trim(),
  }

  if (!account.username || !account.password) {
    throw new Error('Vui lòng nhập tên đăng nhập và mật khẩu.')
  }

  const apiUser = await sendAuthRequest('/auth/login', account)
  if (apiUser) return toPublicUser(normalizeUser(apiUser, account))

  const user = getLocalUsers().find(
    (item) =>
      item.username === account.username && item.password === account.password,
  )

  if (!user) {
    throw new Error('Sai tên đăng nhập hoặc mật khẩu.')
  }

  return toPublicUser(normalizeUser(user))
}

async function saveGoogleUser(profile, credential) {
  const account = {
    credential,
    googleAccount: profile.email,
    password: '',
    picture: profile.picture,
    role: 'user',
    username: profile.email?.split('@')[0] || profile.name,
  }

  const apiUser = await sendAuthRequest('/auth/google', account)
  if (apiUser) return toPublicUser(normalizeUser(apiUser, account))

  const users = getLocalUsers()
  const existingUser = users.find(
    (user) => user.googleAccount === account.googleAccount,
  )

  if (existingUser) return toPublicUser(normalizeUser(existingUser, account))

  const nextUser = normalizeUser(account)
  localStorage.setItem('hskUsers', JSON.stringify([...users, nextUser]))

  return toPublicUser(nextUser)
}

async function sendAuthRequest(endpoint, body) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  if (!apiUrl) return null
  const normalizedApiUrl = apiUrl.replace(/\/$/, '')

  const response = await fetch(`${normalizedApiUrl}${endpoint}`, {
    body: JSON.stringify({ ...body, role: 'user' }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new Error(errorBody?.message || 'Không thể xử lý tài khoản.')
  }

  const payload = await response.json()
  if (payload.token) {
    localStorage.setItem('hskToken', payload.token)
  }
  return payload.user || payload
}

function getLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem('hskUsers')) || []
  } catch {
    return []
  }
}

function normalizeUser(user, fallback = {}) {
  return {
    email: user.email || user.googleAccount || fallback.googleAccount || '',
    googleAccount: user.googleAccount || user.email || fallback.googleAccount || '',
    name: user.name || user.username || fallback.username || 'Người dùng',
    password: user.password || fallback.password || '',
    picture: user.picture || fallback.picture || '',
    role: user.role || 'user',
    username: user.username || fallback.username || user.name || '',
  }
}

function toPublicUser(user) {
  const { password, ...publicUser } = user
  void password
  return publicUser
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }

  const existingScript = document.querySelector(
    'script[src="https://accounts.google.com/gsi/client"]',
  )

  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', resolve, { once: true })
      existingScript.addEventListener('error', reject, { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

function parseGoogleCredential(credential) {
  try {
    const payload = credential.split('.')[1]
    const normalizedPayload = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=')
    const decodedPayload = decodeURIComponent(
      atob(normalizedPayload)
        .split('')
        .map((character) => {
          const code = character.charCodeAt(0).toString(16).padStart(2, '0')
          return `%${code}`
        })
        .join(''),
    )

    return JSON.parse(decodedPayload)
  } catch {
    return null
  }
}

export default App
