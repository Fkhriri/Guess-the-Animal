// Create an array of all available images first
const availableImages = [
    'images/CAT.jpg', 'images/DOG.jpg', 'images/PIG.jpg',
    'images/RND.jpg', 'images/WLF.jpg', 'images/EGL.jpg',
    'images/CPB.jpg', 'images/HDG.jpg', 'images/SHK.jpg',
    'images/FRG.jpg'
];

// Helper function to get random wrong images
function getRandomWrongImages(correctImage) {
    const availableWrongImages = availableImages.filter(img => img !== correctImage);
    return [availableWrongImages[Math.floor(Math.random() * availableWrongImages.length)]];
}

// Konfigurasi Game dengan gambar lokal
const gameConfig = {
    questions: [
        {
            question: "Hewan berkaki empat dan mengeong",
            correctImage: 'images/CAT.jpg',
            get wrongImages() { return getRandomWrongImages('images/CAT.jpg'); }
        },
        {
            question: "Hewan yang dikenal sebagai sahabat manusia",
            correctImage: 'images/DOG.jpg',
            get wrongImages() { return getRandomWrongImages('images/DOG.jpg'); }
        },
        {
            question: "Hewan yang sering disantap oleh warga negara barat",
            correctImage: 'images/PIG.jpg',
            get wrongImages() { return getRandomWrongImages('images/PIG.jpg'); }
        },
        {
            question: "Hewan yang hidup di iklim dingin",
            correctImage: 'images/RND.jpg',
            get wrongImages() { return getRandomWrongImages('images/RND.jpg'); }
        },
        {
            question: "Hewan yang melambangkan kesendirian",
            correctImage: 'images/WLF.jpg',
            get wrongImages() { return getRandomWrongImages('images/WLF.jpg'); }
        },
        {
            question: "Hewan berkaki empat yang bersahabat",
            correctImage: 'images/CPB.jpg',
            get wrongImages() { return getRandomWrongImages('images/CPB.jpg'); }
        },
        {
            question: "Hewan pemburu di langit",
            correctImage: 'images/EGL.jpg',
            get wrongImages() { return getRandomWrongImages('images/EGL.jpg'); }
        },
        {
            question: "Hewan yang muncul saat hujan",
            correctImage: 'images/FRG.jpg',
            get wrongImages() { return getRandomWrongImages('images/FRG.jpg'); }
        },
        {
            question: "Hewan kecil berduri",
            correctImage: 'images/HDG.jpg',
            get wrongImages() { return getRandomWrongImages('images/HDG.jpg'); }
        },
        {
            question: "Hewan pemburu di laut",
            correctImage: 'images/SHK.jpg',
            get wrongImages() { return getRandomWrongImages('images/SHK.jpg'); }
        }
    ],
    scorePerAnswer: 10
};

// Variabel Game
let currentQuestionIndex = 0;
let score = 0;
let gameActive = false;
let timer;
let recognizer;
let currentQuestion;

// Add new variable for game timer
let gameTimer;
const GAME_DURATION = 60000; // 1 minute in milliseconds

// Add after game variables
let answerStats = { A: 0, B: 0, C: 0 };

// Elemen DOM
const startBtn = document.getElementById('start-btn');
const listenBtn = document.getElementById('listen-btn');
const questionElement = document.getElementById('question');
const scoreElement = document.getElementById('score');
const feedbackElement = document.getElementById('feedback');
const imageContainer = document.getElementById('image-container');
const options = document.querySelectorAll('.option');
const labelContainer = document.getElementById('label-container');

// Model TensorFlow
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/9YGuwJJCb/";

// Add audio elements after availableImages
const sounds = {
    bgm: new Audio('sounds/bgm.mp3'),
    correct: new Audio('sounds/correct.mp3'),
    wrong: new Audio('sounds/wrong.mp3'),
    press: new Audio('sounds/press.mp3')
};

// Setup BGM
sounds.bgm.loop = true;

// Add sound control variable and function
let isMuted = false;
function toggleSound() {
    isMuted = !isMuted;
    Object.values(sounds).forEach(sound => sound.muted = isMuted);
    soundBtn.textContent = isMuted ? '🔇' : '🔊';
    if (!isMuted) sounds.press.play();
}

// Add after DOM elements
const soundBtn = document.createElement('button');
soundBtn.textContent = '🔊';
soundBtn.className = 'sound-btn';
soundBtn.onclick = toggleSound;
document.getElementById('game-container').appendChild(soundBtn);

// Fungsi untuk memulai game
function startGame() {
    document.body.classList.remove('pre-game-active');
    currentQuestionIndex = 0;
    score = 0;
    gameActive = true;
    
    // Hide pre-game and show game container
    document.getElementById('pre-game').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    
    startBtn.disabled = true;
    listenBtn.disabled = true; // Disable listen button since it's automatic
    imageContainer.style.display = 'flex';
    
    // Start game timer
    startGameTimer();
    
    updateScore();
    loadNextQuestion();
    // Automatically start voice recognition
    startListening();
    
    sounds.press.play();
    sounds.bgm.play();
}

// Add new function for game timer
function startGameTimer() {
    const startTime = Date.now();
    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'timer';
    document.getElementById('game-container').insertBefore(timerDisplay, document.getElementById('score'));
    
    gameTimer = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, Math.ceil((GAME_DURATION - elapsedTime) / 1000));
        
        timerDisplay.textContent = `Waktu: ${remainingTime} detik`;
        
        if (remainingTime <= 0) {
            clearInterval(gameTimer);
            endGame();
        }
    }, 100);
}

// Fungsi untuk memuat pertanyaan berikutnya
function loadNextQuestion() {
    feedbackElement.textContent = '';
    feedbackElement.className = '';
    
    currentQuestion = gameConfig.questions[
        Math.floor(Math.random() * gameConfig.questions.length)
    ];
    
    questionElement.textContent = currentQuestion.question;
    
    // Get one wrong image
    const wrongImage = currentQuestion.wrongImages[0];
    
    // Get another different wrong image
    const secondWrongImage = availableImages.find(img => 
        img !== currentQuestion.correctImage && 
        img !== wrongImage
    );
    
    const allImages = [
        { img: currentQuestion.correctImage, isCorrect: true },
        { img: wrongImage, isCorrect: false },
        { img: secondWrongImage, isCorrect: false }
    ];
    
    // Calculate which label should be used next for most even distribution
    const totalAnswers = Object.values(answerStats).reduce((a, b) => a + b, 0);
    const idealCount = Math.floor(totalAnswers / 3);
    
    let correctLabel;
    if (totalAnswers === 0) {
        // First question - randomly choose
        correctLabel = ['A', 'B', 'C'][Math.floor(Math.random() * 3)];
    } else {
        // Find the label that's been used least
        const sortedLabels = Object.entries(answerStats)
            .sort(([,a], [,b]) => a - b)
            .map(([label]) => label);
        correctLabel = sortedLabels[0];
    }
    
    // Get remaining labels and shuffle them
    const remainingLabels = ['A', 'B', 'C'].filter(l => l !== correctLabel);
    remainingLabels.sort(() => Math.random() - 0.5);
    
    // Assign images and labels
    const shuffledImages = allImages.sort(() => Math.random() - 0.5);
    shuffledImages.forEach((imageData, index) => {
        const option = options[index];
        option.src = imageData.img;
        if (imageData.isCorrect) {
            option.dataset.value = correctLabel;
            currentQuestion.answer = correctLabel;
            answerStats[correctLabel]++;
        } else {
            option.dataset.value = remainingLabels.pop();
        }
        option.classList.remove('selected');
    });
    
    stopListening();
    setTimeout(startListening, 500);
}

// Fungsi untuk memeriksa jawaban
function checkAnswer(selectedOption) {
    sounds.press.play();
    stopListening();
    
    let selectedElement = null;
    options.forEach(option => {
        if (option.dataset.value === selectedOption) {
            selectedElement = option;
        }
    });
    
    if (!selectedElement) return;
    
    selectedElement.classList.add('selected');
    
    const isCorrect = selectedOption === currentQuestion.answer;
    
    if (isCorrect) {
        sounds.correct.play();
        feedbackElement.textContent = 'Benar! +10 Poin';
        feedbackElement.className = 'correct';
        score += gameConfig.scorePerAnswer;
        updateScore();
    } else {
        sounds.wrong.play();
        feedbackElement.textContent = 'Salah! Coba lagi';
        feedbackElement.className = 'wrong';
    }
    
    setTimeout(loadNextQuestion, 1500);
}

// Fungsi untuk mengupdate skor
function updateScore() {
    scoreElement.textContent = `Skor: ${score}`;
    scoreElement.classList.add('score-update');
    setTimeout(() => {
        scoreElement.classList.remove('score-update');
    }, 500);
}

// Fungsi untuk mengakhiri game
function endGame() {
    gameActive = false;
    stopListening();
    clearInterval(gameTimer);
    
    // Remove timer display
    const timerDisplay = document.getElementById('timer');
    if (timerDisplay) timerDisplay.remove();
    
    // Show end game message
    questionElement.textContent = `Waktu Habis! Skor akhir Anda: ${score}`;
    imageContainer.style.display = 'none';
    listenBtn.disabled = true;
    startBtn.disabled = false;
    startBtn.textContent = 'Main Lagi';
    
    // Reset feedback
    feedbackElement.textContent = '';
    feedbackElement.className = '';
    
    // After 2 seconds, show pre-game screen
    setTimeout(() => {
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('pre-game').style.display = 'block';
        document.body.classList.add('pre-game-active');
        startBtn.textContent = 'Mulai Game';
    }, 2000);
}

// Fungsi untuk membuat model
async function createModel() {
    const checkpointURL = MODEL_URL + "model.json";
    const metadataURL = MODEL_URL + "metadata.json";

    recognizer = speechCommands.create(
        "BROWSER_FFT",
        undefined,
        checkpointURL,
        metadataURL);

    await recognizer.ensureModelLoaded();
    return recognizer;
}

// Fungsi untuk memulai mendengarkan
async function startListening() {
    if (!recognizer) {
        recognizer = await createModel();
    }

    // Kosongkan label container
    labelContainer.innerHTML = '';
    
    // Tambahkan label untuk setiap kelas
    const classLabels = recognizer.wordLabels();
    for (let i = 0; i < classLabels.length; i++) {
        labelContainer.appendChild(document.createElement('div'));
    }

    recognizer.listen(result => {
        const scores = result.scores;
        
        // Tampilkan probabilitas untuk setiap kelas
        for (let i = 0; i < classLabels.length; i++) {
            const classPrediction = classLabels[i] + ": " + result.scores[i].toFixed(2);
            labelContainer.childNodes[i].innerHTML = classPrediction;
        }
        
        // Cari prediksi dengan skor tertinggi
        const maxScore = Math.max(...scores);
        const predictedClass = classLabels[scores.indexOf(maxScore)];
        
        // Jika skor cukup tinggi, proses jawaban
        if (maxScore > 0.9 && ['A', 'B', 'C'].includes(predictedClass)) {
            checkAnswer(predictedClass);
        }
    }, {
        includeSpectrogram: true,
        probabilityThreshold: 0.35 ,
        invokeCallbackOnNoiseAndUnknown: true,
        overlapFactor: 0.50
    });

    listenBtn.textContent = "Mendengarkan...";
    listenBtn.disabled = true;
}

// Fungsi untuk menghentikan mendengarkan
function stopListening() {
    if (recognizer) {
        recognizer.stopListening();
        listenBtn.textContent = "Mulai Mendengarkan";
        listenBtn.disabled = false;
    }
}

// Event Listeners
startBtn.addEventListener('click', startGame);
listenBtn.addEventListener('click', () => {
    if (listenBtn.textContent === "Mulai Mendengarkan") {
        startListening();
    } else {
        stopListening();
    }
});

// Event listener untuk klik gambar
options.forEach(option => {
    option.addEventListener('click', () => {
        if (gameActive) {
            sounds.press.play();
            checkAnswer(option.dataset.value);
        }
    });
});

// Inisialisasi
document.body.classList.add('pre-game-active');
questionElement.textContent = "Klik 'Mulai Game' untuk bermain!";
imageContainer.style.display = 'flex';