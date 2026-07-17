// Starter isiZulu vocabulary for IEB First Additional Language level.
// Grouped by theme. Each word: { isizulu, english, example?, nounClass? }
//
// NOTES on noun classes: isiZulu nouns belong to classes shown by their prefix
// (e.g. um-/aba-, i(li)-/ama-, isi-/izi-, in-/izin-). Where a class is well
// established it's noted; verbs (uku-) and descriptives (which take concords)
// don't carry a noun class, so those are left blank on purpose.
//
// These are the built-in "seed" categories. The learner can add their own
// custom categories and words from their syllabus in the Vocab tab.

export const SEED_CATEGORIES = [
  { id: 'greetings',  name: 'Greetings & Basics', emoji: '👋' },
  { id: 'family',     name: 'Family',             emoji: '👪' },
  { id: 'school',     name: 'School',             emoji: '🏫' },
  { id: 'food',       name: 'Food & Drink',       emoji: '🍲' },
  { id: 'verbs',      name: 'Verbs',              emoji: '🏃' },
  { id: 'adjectives', name: 'Describing Words',   emoji: '🎨' },
  { id: 'colours',    name: 'Colours',            emoji: '🌈' },
  { id: 'body',       name: 'Body',               emoji: '🧍' },
  { id: 'animals',    name: 'Animals',            emoji: '🐘' },
  { id: 'numbers',    name: 'Numbers',            emoji: '🔢' },
]

export const SEED_WORDS = [
  // ---------- Greetings & Basics ----------
  { category: 'greetings', isizulu: 'Sawubona', english: 'Hello (to one person)', example: 'Sawubona, unjani? — Hello, how are you?' },
  { category: 'greetings', isizulu: 'Sanibonani', english: 'Hello (to many people)', example: 'Sanibonani bafundi! — Hello, learners!' },
  { category: 'greetings', isizulu: 'Unjani?', english: 'How are you? (to one)', example: 'Unjani namuhla? — How are you today?' },
  { category: 'greetings', isizulu: 'Ngiyaphila', english: 'I am well', example: 'Ngiyaphila, ngiyabonga. — I am well, thank you.' },
  { category: 'greetings', isizulu: 'Ngiyabonga', english: 'Thank you', example: 'Ngiyabonga kakhulu! — Thank you very much!' },
  { category: 'greetings', isizulu: 'Yebo', english: 'Yes' },
  { category: 'greetings', isizulu: 'Cha', english: 'No' },
  { category: 'greetings', isizulu: 'Uxolo', english: 'Sorry / excuse me' },
  { category: 'greetings', isizulu: 'Ngicela', english: 'Please / I request', example: 'Ngicela amanzi. — May I have water, please.' },
  { category: 'greetings', isizulu: 'Hamba kahle', english: 'Go well (goodbye, to one leaving)' },
  { category: 'greetings', isizulu: 'Sala kahle', english: 'Stay well (goodbye, to one staying)' },
  { category: 'greetings', isizulu: 'Igama lami ngu...', english: 'My name is...', example: 'Igama lami nguThemba. — My name is Themba.' },
  { category: 'greetings', isizulu: 'Ubani igama lakho?', english: 'What is your name?' },

  // ---------- Family ----------
  { category: 'family', isizulu: 'umndeni', english: 'family', nounClass: '3' },
  { category: 'family', isizulu: 'umama', english: 'mother', nounClass: '1a' },
  { category: 'family', isizulu: 'ubaba', english: 'father', nounClass: '1a' },
  { category: 'family', isizulu: 'umfowethu', english: 'my brother' },
  { category: 'family', isizulu: 'udadewethu', english: 'my sister' },
  { category: 'family', isizulu: 'ugogo', english: 'grandmother', nounClass: '1a' },
  { category: 'family', isizulu: 'umkhulu', english: 'grandfather', nounClass: '1a' },
  { category: 'family', isizulu: 'umntwana', english: 'child', nounClass: '1' },
  { category: 'family', isizulu: 'ingane', english: 'baby / child', nounClass: '9' },
  { category: 'family', isizulu: 'indodana', english: 'son', nounClass: '9' },
  { category: 'family', isizulu: 'indodakazi', english: 'daughter', nounClass: '9' },
  { category: 'family', isizulu: 'umalume', english: 'uncle (mother’s brother)', nounClass: '1a' },
  { category: 'family', isizulu: 'ubabakazi', english: 'aunt (father’s sister)', nounClass: '1a' },

  // ---------- School ----------
  { category: 'school', isizulu: 'isikole', english: 'school', nounClass: '7' },
  { category: 'school', isizulu: 'uthisha', english: 'teacher', nounClass: '1a' },
  { category: 'school', isizulu: 'umfundi', english: 'learner / student', nounClass: '1' },
  { category: 'school', isizulu: 'incwadi', english: 'book / letter', nounClass: '9' },
  { category: 'school', isizulu: 'ipeni', english: 'pen', nounClass: '5' },
  { category: 'school', isizulu: 'ipensela', english: 'pencil', nounClass: '5' },
  { category: 'school', isizulu: 'itafula', english: 'table', nounClass: '5' },
  { category: 'school', isizulu: 'isihlalo', english: 'chair', nounClass: '7' },
  { category: 'school', isizulu: 'umsebenzi', english: 'work / homework', nounClass: '3' },
  { category: 'school', isizulu: 'ikilasi', english: 'class / classroom', nounClass: '5' },
  { category: 'school', isizulu: 'isifundo', english: 'lesson', nounClass: '7' },

  // ---------- Food & Drink ----------
  { category: 'food', isizulu: 'ukudla', english: 'food', nounClass: '15' },
  { category: 'food', isizulu: 'amanzi', english: 'water', nounClass: '6' },
  { category: 'food', isizulu: 'ubisi', english: 'milk', nounClass: '11' },
  { category: 'food', isizulu: 'isinkwa', english: 'bread', nounClass: '7' },
  { category: 'food', isizulu: 'inyama', english: 'meat', nounClass: '9' },
  { category: 'food', isizulu: 'amazambane', english: 'potatoes', nounClass: '6' },
  { category: 'food', isizulu: 'iphalishi', english: 'porridge (maize)', nounClass: '5' },
  { category: 'food', isizulu: 'itiye', english: 'tea', nounClass: '5' },
  { category: 'food', isizulu: 'ikhofi', english: 'coffee', nounClass: '5' },
  { category: 'food', isizulu: 'ushukela', english: 'sugar', nounClass: '1a' },
  { category: 'food', isizulu: 'amasi', english: 'sour / fermented milk', nounClass: '6' },
  { category: 'food', isizulu: 'iapula', english: 'apple', nounClass: '5' },

  // ---------- Verbs (infinitive, uku-) ----------
  { category: 'verbs', isizulu: 'ukudla', english: 'to eat' },
  { category: 'verbs', isizulu: 'ukuphuza', english: 'to drink' },
  { category: 'verbs', isizulu: 'ukuhamba', english: 'to go / to walk' },
  { category: 'verbs', isizulu: 'ukufika', english: 'to arrive' },
  { category: 'verbs', isizulu: 'ukubona', english: 'to see' },
  { category: 'verbs', isizulu: 'ukuzwa', english: 'to hear / to feel' },
  { category: 'verbs', isizulu: 'ukukhuluma', english: 'to speak' },
  { category: 'verbs', isizulu: 'ukufunda', english: 'to read / to learn' },
  { category: 'verbs', isizulu: 'ukubhala', english: 'to write' },
  { category: 'verbs', isizulu: 'ukusebenza', english: 'to work' },
  { category: 'verbs', isizulu: 'ukulala', english: 'to sleep' },
  { category: 'verbs', isizulu: 'ukuvuka', english: 'to wake up' },
  { category: 'verbs', isizulu: 'ukuthanda', english: 'to like / to love' },
  { category: 'verbs', isizulu: 'ukuhlala', english: 'to sit / to stay / to live' },
  { category: 'verbs', isizulu: 'ukugijima', english: 'to run' },
  { category: 'verbs', isizulu: 'ukusiza', english: 'to help' },

  // ---------- Describing words (take concords) ----------
  { category: 'adjectives', isizulu: '-khulu', english: 'big / large', example: 'indlu enkulu — a big house' },
  { category: 'adjectives', isizulu: '-ncane', english: 'small', example: 'inja encane — a small dog' },
  { category: 'adjectives', isizulu: '-de', english: 'tall / long', example: 'umuntu omude — a tall person' },
  { category: 'adjectives', isizulu: '-fushane', english: 'short' },
  { category: 'adjectives', isizulu: '-hle', english: 'beautiful / nice / good', example: 'usuku oluhle — a nice day' },
  { category: 'adjectives', isizulu: '-bi', english: 'bad / ugly' },
  { category: 'adjectives', isizulu: '-sha', english: 'new' },
  { category: 'adjectives', isizulu: '-dala', english: 'old' },
  { category: 'adjectives', isizulu: 'mnandi', english: 'tasty / pleasant', example: 'Kumnandi! — It’s delicious!' },
  { category: 'adjectives', isizulu: '-banzi', english: 'wide / broad' },

  // ---------- Colours ----------
  { category: 'colours', isizulu: '-mhlophe', english: 'white' },
  { category: 'colours', isizulu: '-mnyama', english: 'black' },
  { category: 'colours', isizulu: '-bomvu', english: 'red' },
  { category: 'colours', isizulu: '-luhlaza okwesibhakabhaka', english: 'blue (sky-coloured)' },
  { category: 'colours', isizulu: '-luhlaza okotshani', english: 'green (grass-coloured)' },
  { category: 'colours', isizulu: '-phuzi', english: 'yellow' },
  { category: 'colours', isizulu: '-mpofu', english: 'brown / beige' },

  // ---------- Body ----------
  { category: 'body', isizulu: 'umzimba', english: 'body', nounClass: '3' },
  { category: 'body', isizulu: 'ikhanda', english: 'head', nounClass: '5' },
  { category: 'body', isizulu: 'iso', english: 'eye', nounClass: '5', example: 'amehlo — eyes (plural)' },
  { category: 'body', isizulu: 'indlebe', english: 'ear', nounClass: '9' },
  { category: 'body', isizulu: 'ikhala', english: 'nose', nounClass: '5' },
  { category: 'body', isizulu: 'umlomo', english: 'mouth', nounClass: '3' },
  { category: 'body', isizulu: 'izinyo', english: 'tooth', nounClass: '5', example: 'amazinyo — teeth (plural)' },
  { category: 'body', isizulu: 'isandla', english: 'hand', nounClass: '7', example: 'izandla — hands (plural)' },
  { category: 'body', isizulu: 'unyawo', english: 'foot', nounClass: '11', example: 'izinyawo — feet (plural)' },
  { category: 'body', isizulu: 'inhliziyo', english: 'heart', nounClass: '9' },
  { category: 'body', isizulu: 'isisu', english: 'stomach', nounClass: '7' },
  { category: 'body', isizulu: 'unwele', english: 'hair (single strand)', nounClass: '11', example: 'izinwele — hair' },

  // ---------- Animals ----------
  { category: 'animals', isizulu: 'inja', english: 'dog', nounClass: '9' },
  { category: 'animals', isizulu: 'ikati', english: 'cat', nounClass: '5' },
  { category: 'animals', isizulu: 'inkomo', english: 'cow', nounClass: '9' },
  { category: 'animals', isizulu: 'imbuzi', english: 'goat', nounClass: '9' },
  { category: 'animals', isizulu: 'imvu', english: 'sheep', nounClass: '9' },
  { category: 'animals', isizulu: 'ihhashi', english: 'horse', nounClass: '5' },
  { category: 'animals', isizulu: 'inkukhu', english: 'chicken', nounClass: '9' },
  { category: 'animals', isizulu: 'inyoni', english: 'bird', nounClass: '9' },
  { category: 'animals', isizulu: 'ingwe', english: 'leopard', nounClass: '9' },
  { category: 'animals', isizulu: 'ibhubesi', english: 'lion', nounClass: '5' },
  { category: 'animals', isizulu: 'indlovu', english: 'elephant', nounClass: '9' },
  { category: 'animals', isizulu: 'inyoka', english: 'snake', nounClass: '9' },
  { category: 'animals', isizulu: 'ufudu', english: 'tortoise', nounClass: '11' },

  // ---------- Numbers ----------
  { category: 'numbers', isizulu: 'kunye', english: 'one (1)' },
  { category: 'numbers', isizulu: 'kubili', english: 'two (2)' },
  { category: 'numbers', isizulu: 'kuthathu', english: 'three (3)' },
  { category: 'numbers', isizulu: 'kune', english: 'four (4)' },
  { category: 'numbers', isizulu: 'kuhlanu', english: 'five (5)' },
  { category: 'numbers', isizulu: 'isithupha', english: 'six (6)' },
  { category: 'numbers', isizulu: 'isikhombisa', english: 'seven (7)' },
  { category: 'numbers', isizulu: 'isishiyagalombili', english: 'eight (8)' },
  { category: 'numbers', isizulu: 'isishiyagalolunye', english: 'nine (9)' },
  { category: 'numbers', isizulu: 'ishumi', english: 'ten (10)' },
]
