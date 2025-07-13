document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusDisplay = document.getElementById('status');
    const newGameBtn = document.getElementById('newGameBtn');
    const winModal = document.getElementById('winModal');
    const winMessage = document.getElementById('winMessage');
    const modalNewGameBtn = document.getElementById('modalNewGameBtn');

    // --- Konfiguracja Gry ---
    const PLAYER_NAMES = [null, 'Ronaldo', 'Neymar']; // Indeks 0 nieużywany
    const PLAYER_JERSEYS = [null, '7', '10']; // Numery koszulek
    const LOGICAL_COLS = 10; // Stała liczba kolumn (oryginalnie 500px / 50px)
    const LOGICAL_ROWS = 13; // Stała liczba wierszy (oryginalnie 650px / 50px)
    let GRID_SIZE; // Rozmiar komórki siatki, obliczany dynamicznie
    let DOT_RADIUS; // Promień kropki, obliczany dynamicznie

    // Kolory
    const PITCH_COLOR = '#6abf69';
    const LINE_COLOR = '#FFF';
    const DOT_COLOR = '#DDD';
    const BORDER_COLOR = '#FFF';
    const BALL_COLOR_P1 = '#E30613'; // Czerwony (Ronaldo - Portugalia/Man Utd)
    const BALL_COLOR_P2 = '#FFD700'; // Żółty (Neymar - Brazylia)
    const PATH_COLOR = '#FFFFFF80'; // Półprzezroczysty biały
    const GOAL_COLOR_P1 = '#E3061340'; // Bramka Ronaldo
    const GOAL_COLOR_P2 = '#FFD70040'; // Bramka Neymara

    // --- Stan Gry ---
    let currentPlayer;
    let ballPos; // {x, y} w koordynatach siatki
    let drawnLines; // Przechowuje narysowane linie, aby zapobiec ich ponownemu użyciu
    let occupiedNodes; // Przechowuje informacje o zajętych punktach siatki
    let gameOver;
    let isAnimating = false; // Zapobiega klikaniu podczas animacji

    // --- Funkcje Główne ---

    function init() {
        currentPlayer = 1;
        // Ustawienie piłki na środku boiska
        ballPos = { x: Math.floor(LOGICAL_COLS / 2), y: Math.floor(LOGICAL_ROWS / 2) };
        drawnLines = new Set();
        occupiedNodes = new Set();
        occupiedNodes.add(`${ballPos.x},${ballPos.y}`);
        isAnimating = false;
        gameOver = false;

        addBoundaryLines(); // Kluczowa zmiana: dodaj granice boiska do narysowanych linii

        winModal.style.display = 'none'; // Upewnij się, że modal jest ukryty

        updateStatus();
        resizeAndRedraw(); // Ustawia rozmiar i rysuje planszę
    }

    function addBoundaryLines() {
        const fieldLeft = 1;
        const fieldRight = LOGICAL_COLS - 1;
        const fieldTop = 1;
        const fieldBottom = LOGICAL_ROWS - 1;
        const goalMinX = LOGICAL_COLS / 2 - 1;
        const goalMaxX = LOGICAL_COLS / 2 + 1;

        // Linie poziome (górna i dolna krawędź boiska, z przerwą na bramki)
        for (let x = fieldLeft; x < fieldRight; x++) {
            if (x < goalMinX || x >= goalMaxX) {
                drawnLines.add(`${x},${fieldTop},${x + 1},${fieldTop}`);
                drawnLines.add(`${x},${fieldBottom},${x + 1},${fieldBottom}`);
            }
        }

        // Linie pionowe (lewa i prawa krawędź boiska)
        for (let y = fieldTop; y < fieldBottom; y++) {
            drawnLines.add(`${fieldLeft},${y},${fieldLeft},${y + 1}`);
            drawnLines.add(`${fieldRight},${y},${fieldRight},${y + 1}`);
        }
    }

    function resizeAndRedraw() {
        // 1. Oblicz optymalny rozmiar canvasa na podstawie dostępnego miejsca i proporcji
        // Używamy wartości procentowych podobnych do tych w CSS (max-height: 80vh, max-width: 95vw)
        const maxHeight = window.innerHeight * 0.80;
        const maxWidth = window.innerWidth * 0.95;

        const aspectRatio = LOGICAL_COLS / LOGICAL_ROWS;

        let newWidth = maxWidth;
        let newHeight = newWidth / aspectRatio;

        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = newHeight * aspectRatio;
        }

        // 2. Ustaw fizyczne wymiary canvasa (to czyści canvas)
        canvas.width = newWidth;
        canvas.height = newHeight;

        // 3. Przelicz zmienne zależne od rozmiaru
        GRID_SIZE = canvas.width / LOGICAL_COLS;
        // Skalujemy promień kropki, aby wyglądał dobrze na każdym rozmiarze
        DOT_RADIUS = GRID_SIZE / 12;

        drawBoard();
    }

    function drawBoard() {
        // Tło (murawa)
        ctx.fillStyle = PITCH_COLOR;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Oznaczenie bramek kolorami graczy
        const goalMinXCoord = GRID_SIZE * (LOGICAL_COLS/2 - 1);
        const goalWidth = GRID_SIZE * 2;
        // Bramka na górze (atakowana przez Neymara) - w kolorze Ronaldo
        ctx.fillStyle = GOAL_COLOR_P1;
        ctx.fillRect(goalMinXCoord, 0, goalWidth, GRID_SIZE);
        // Bramka na dole (atakowana przez Ronaldo) - w kolorze Neymara
        ctx.fillStyle = GOAL_COLOR_P2;
        ctx.fillRect(goalMinXCoord, canvas.height - GRID_SIZE, goalWidth, GRID_SIZE);

        // Linie siatki i kropki
        ctx.strokeStyle = DOT_COLOR;
        ctx.fillStyle = DOT_COLOR;
        for (let y = 1; y < LOGICAL_ROWS; y++) {
            for (let x = 1; x < LOGICAL_COLS; x++) {
                ctx.beginPath();
                ctx.arc(x * GRID_SIZE, y * GRID_SIZE, DOT_RADIUS, 0, 2 * Math.PI);
                ctx.fill();
            }
        }

        // Dodaj kropki wewnątrz bramek, aby było widać, gdzie strzelać
        const goalMinX = LOGICAL_COLS / 2 - 1;
        const goalMaxX = LOGICAL_COLS / 2 + 1;
        ctx.fillStyle = DOT_COLOR;
        for (let x = goalMinX; x <= goalMaxX; x++) {
            // Bramka górna (y=0)
            ctx.beginPath();
            ctx.arc(x * GRID_SIZE, 0, DOT_RADIUS, 0, 2 * Math.PI);
            ctx.fill();
            // Bramka dolna (y=LOGICAL_ROWS)
            ctx.beginPath();
            ctx.arc(x * GRID_SIZE, LOGICAL_ROWS * GRID_SIZE, DOT_RADIUS, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Podświetlanie możliwych ruchów
        if (!gameOver && !isAnimating) {
            const validMoves = getValidMoves();
            ctx.fillStyle = '#FFFF0080'; // Półprzezroczysty żółty
            validMoves.forEach(move => {
                ctx.beginPath();
                // Rysuj okrąg podświetlenia nieco większy niż kropka
                ctx.arc(move.x * GRID_SIZE, move.y * GRID_SIZE, DOT_RADIUS * 1.8, 0, 2 * Math.PI);
                ctx.fill();
            });
        }

        // Bramki i linie boiska
        ctx.strokeStyle = BORDER_COLOR;
        ctx.lineWidth = 3;
        
        // Rysowanie całego obrysu boiska z bramkami jako jedna, ciągła ścieżka
        ctx.beginPath();

        const fieldLeftX = GRID_SIZE;
        const fieldRightX = canvas.width - GRID_SIZE;
        const fieldTopY = GRID_SIZE;
        const fieldBottomY = canvas.height - GRID_SIZE;

        // Zaczynamy od lewego górnego rogu boiska i rysujemy zgodnie z ruchem wskazówek zegara
        ctx.moveTo(fieldLeftX, fieldTopY);
        // Linia do lewego słupka górnej bramki
        ctx.lineTo(goalMinXCoord, fieldTopY);
        // Lewy słupek
        ctx.lineTo(goalMinXCoord, 0);
        // Poprzeczka górnej bramki
        ctx.lineTo(goalMinXCoord + goalWidth, 0);
        // Prawy słupek
        ctx.lineTo(goalMinXCoord + goalWidth, fieldTopY);
        // Linia do prawego górnego rogu boiska
        ctx.lineTo(fieldRightX, fieldTopY);
        // Prawa linia boczna
        ctx.lineTo(fieldRightX, fieldBottomY);
        // Linia do prawego słupka dolnej bramki
        ctx.lineTo(goalMinXCoord + goalWidth, fieldBottomY);
        // Prawy słupek dolnej bramki i poprzeczka
        ctx.lineTo(goalMinXCoord + goalWidth, canvas.height);
        ctx.lineTo(goalMinXCoord, canvas.height);
        // Lewy słupek dolnej bramki
        ctx.lineTo(goalMinXCoord, fieldBottomY);
        // Linia do lewego dolnego rogu boiska
        ctx.lineTo(fieldLeftX, fieldBottomY);
        // Zamknięcie ścieżki, które teraz poprawnie narysuje lewą linię boczną
        ctx.closePath(); 
        ctx.stroke();

        // Rysowanie ścieżki
        ctx.strokeStyle = PATH_COLOR;
        ctx.lineWidth = 3;
        ctx.beginPath();
        drawnLines.forEach(line => {
            const [x1, y1, x2, y2] = line.split(',').map(Number);
            ctx.moveTo(x1 * GRID_SIZE, y1 * GRID_SIZE);
            ctx.lineTo(x2 * GRID_SIZE, y2 * GRID_SIZE);
        });
        ctx.stroke();

        // Rysowanie piłki z numerem koszulki
        const ballX = ballPos.x * GRID_SIZE;
        const ballY = ballPos.y * GRID_SIZE;
        const playerTokenRadius = DOT_RADIUS * 2.8;

        // Rysowanie tła (kółka) dla gracza
        ctx.beginPath();
        ctx.arc(ballX, ballY, playerTokenRadius, 0, 2 * Math.PI);
        ctx.fillStyle = (currentPlayer === 1) ? BALL_COLOR_P1 : BALL_COLOR_P2;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Rysowanie numeru na koszulce
        const jerseyNumber = PLAYER_JERSEYS[currentPlayer];
        const fontSize = playerTokenRadius * 1.3; // Dopasuj rozmiar czcionki do tokenu
        ctx.font = `bold ${fontSize}px sans-serif`;
        // Zmiana koloru czcionki dla lepszej czytelności
        if (currentPlayer === 2) { // Neymar - żółta koszulka, ciemnozielony numer
            ctx.fillStyle = '#008000'; // Ciemnozielony numer
        } else { // Ronaldo - czerwona koszulka, żółty numer
            ctx.fillStyle = '#FFFF00'; // Żółty numer
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Drobna korekta pionowa dla lepszego wyglądu
        ctx.fillText(jerseyNumber, ballX, ballY + fontSize * 0.05); 
    }
    



    function updateStatus() {
        if (gameOver) {
            statusDisplay.textContent = `Wygrywa ${PLAYER_NAMES[currentPlayer]}!`;
        } else {
            statusDisplay.textContent = `Tura: ${PLAYER_NAMES[currentPlayer]}`;
        }
    }

    function handleCanvasClick(event) {
        if (gameOver || isAnimating) return; // Zablokuj kliknięcia podczas gry i animacji

        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Znajdź najbliższy punkt siatki
        const targetX = Math.round(mouseX / GRID_SIZE);
        const targetY = Math.round(mouseY / GRID_SIZE);

        if (isValidMove(ballPos.x, ballPos.y, targetX, targetY)) {
            makeMove(targetX, targetY);
        }
    }

    function isValidMove(fromX, fromY, toX, toY) {
        // Sprawdź, czy ruch jest do sąsiedniego punktu (w pionie, poziomie lub po przekątnej)
        const dx = Math.abs(fromX - toX);
        const dy = Math.abs(fromY - toY);
        if (dx > 1 || dy > 1 || (dx === 0 && dy === 0)) {
            return false;
        }

        // Sprawdź, czy linia nie została już narysowana
        // Sprawdzamy w obu kierunkach, aby uniknąć duplikatów
        const line1 = `${fromX},${fromY},${toX},${toY}`;
        const line2 = `${toX},${toY},${fromX},${fromY}`;
        if (drawnLines.has(line1) || drawnLines.has(line2)) {
            return false;
        }

        // --- Ulepszona i bardziej czytelna walidacja granic boiska i bramek ---

        const goalMinX = LOGICAL_COLS/2 - 1;
        const goalMaxX = LOGICAL_COLS/2 + 1;

        // Sprawdź, czy ruch kończy się w którejś z bramek
        const isMoveToTopGoal = (toY === 0 && toX >= goalMinX && toX <= goalMaxX);
        const isMoveToBottomGoal = (toY === LOGICAL_ROWS && toX >= goalMinX && toX <= goalMaxX);

        // Ruch jest dozwolony, jeśli jest to ruch do WŁAŚCIWEJ bramki
        if (currentPlayer === 1 && isMoveToBottomGoal) { // Ronaldo
            return true; // Ronaldo może strzelić do dolnej bramki
        }
        if (currentPlayer === 2 && isMoveToTopGoal) { // Neymar
            return true; // Neymar może strzelić do górnej bramki
        }

        // W przeciwnym wypadku, ruch jest dozwolony tylko w granicach boiska
        const isInField = (toX >= 1 && toX <= LOGICAL_COLS - 1 && toY >= 1 && toY <= LOGICAL_ROWS - 1);

        return isInField; // Zwróć true, jeśli ruch jest na boisku, w przeciwnym razie false
    }

    function getValidMoves() {
        const moves = [];
        const { x, y } = ballPos;
        // Sprawdź wszystkich 8 sąsiadów
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue; // Pomiń aktualną pozycję

                const targetX = x + dx;
                const targetY = y + dy;

                if (isValidMove(x, y, targetX, targetY)) {
                    moves.push({ x: targetX, y: targetY });
                }
            }
        }
        return moves;
    }

    function hasAnyValidMoves() {
        return getValidMoves().length > 0;
    }

    function makeMove(toX, toY) {
        const fromPos = { ...ballPos }; // Kopia pozycji startowej
        const toPos = { x: toX, y: toY };

        // Dodaj linię do narysowanych od razu, aby była widoczna podczas animacji
        const line = `${fromPos.x},${fromPos.y},${toPos.x},${toPos.y}`;
        drawnLines.add(line);

        // Uruchom animację, a resztę logiki wykonaj po jej zakończeniu
        animateBall(fromPos, toPos, () => {
            // Ta funkcja zwrotna (callback) wykona się po dotarciu piłki do celu

            // Sprawdź warunek zwycięstwa przez gol
            if (checkWin(toPos.x, toPos.y)) { 
                // EFEKT WIZUALNY: Po strzeleniu gola, przesuń piłkę lekko w głąb bramki
                if (currentPlayer === 1) { // Ronaldo strzela w dół
                    ballPos = { x: toPos.x, y: toPos.y + 0.2 };
                } else { // Neymar strzela w górę
                    ballPos = { x: toPos.x, y: toPos.y - 0.2 };
                }

                gameOver = true;
                updateStatus();
                drawBoard(); // Ostateczne przerysowanie z piłką w bramce
                showWinModal(`Wygrywa ${PLAYER_NAMES[currentPlayer]}!`);
                return;
            }

            const isBounce = isBounceNode(toPos.x, toPos.y);

            // Dodaj nowy punkt do "zajętych"
            occupiedNodes.add(`${toPos.x},${toPos.y}`);

            if (!isBounce) {
                // Jeśli nie ma "odbicia", zmień gracza
                switchPlayer();
            } else {
                // Jeśli jest odbicie, gracz ma kolejny ruch
                statusDisplay.textContent = `Odbicie! ${PLAYER_NAMES[currentPlayer]} kontynuuje.`;
            }

            // Po ruchu (i ewentualnej zmianie gracza) przerysuj planszę, by pokazać nowe podświetlenia
            drawBoard();

            // Sprawdź, czy gracz, którego jest teraz tura, nie jest zablokowany
            if (!hasAnyValidMoves()) {
                gameOver = true;
                const blockedPlayer = currentPlayer;
                const winner = (currentPlayer === 1) ? 2 : 1;
                // Ustawiamy zwycięzcę jako aktualnego gracza dla spójności komunikatu
                currentPlayer = winner; 
                const message = `${PLAYER_NAMES[blockedPlayer]} zablokowany! Wygrywa ${PLAYER_NAMES[winner]}.`;
                showWinModal(message);
            }
        });
    }

    function animateBall(fromPos, toPos, onComplete) {
        isAnimating = true;
        const duration = 200; // Czas trwania animacji w ms
        let startTime = null;

        function animationStep(currentTime) {
            if (!startTime) startTime = currentTime;
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);

            ballPos.x = fromPos.x + (toPos.x - fromPos.x) * progress;
            ballPos.y = fromPos.y + (toPos.y - fromPos.y) * progress;

            drawBoard(); // Rysuj planszę w każdej klatce

            if (progress < 1) {
                requestAnimationFrame(animationStep);
            } else {
                isAnimating = false;
                ballPos = toPos; // Upewnij się, że pozycja końcowa jest dokładna
                if (onComplete) {
                    onComplete();
                }
            }
        }

        requestAnimationFrame(animationStep);
    }

    // Prosta i poprawna logika odbić
    function isBounceNode(x, y) {
        // 1. Odbicie, jeśli lądujemy na zajętym już węźle.
        if (occupiedNodes.has(`${x},${y}`)) {
            return true;
        }

        // 2. Sprawdzenie, czy lądujemy na granicy boiska.
        const isonVerticalBoundary = (x === 1 || x === LOGICAL_COLS - 1);
        const isonHorizontalBoundary = (y === 1 || y === LOGICAL_ROWS - 1);

        if (!isonVerticalBoundary && !isonHorizontalBoundary) {
            return false; // Nie jest na granicy, więc nie ma odbicia.
        }

        // 3. Wyjątek: nie ma odbicia na środkowym punkcie przed bramką.
        const isGoalFrontCenter = (x === LOGICAL_COLS / 2) && isonHorizontalBoundary;

        // Jest odbicie, jeśli jesteśmy na granicy I NIE jest to środek przed bramką.
        return !isGoalFrontCenter;
    }

    function checkWin(x, y) {
        const goalMinX = LOGICAL_COLS / 2 - 1;
        const goalMaxX = LOGICAL_COLS / 2 + 1;

        // Ronaldo (1) strzela do dolnej bramki, Neymar (2) do górnej
        // Sprawdzamy, czy piłka jest na linii bramkowej ORAZ między słupkami
        if (currentPlayer === 1 && y === LOGICAL_ROWS && x >= goalMinX && x <= goalMaxX) {
            return true;
        }
        if (currentPlayer === 2 && y === 0 && x >= goalMinX && x <= goalMaxX) {
            return true;
        }
        return false;
    }

    function switchPlayer() {
        currentPlayer = currentPlayer === 1 ? 2 : 1;
        updateStatus();
    }

    function showWinModal(message) {
        winMessage.textContent = message || `Wygrywa ${PLAYER_NAMES[currentPlayer]}!`;
        winModal.style.display = 'flex';
    }

    // --- Event Listeners ---
    // Używamy "debouncingu", aby funkcja resize nie była wywoływana zbyt często
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resizeAndRedraw, 100); // Czekaj 100ms po ostatniej zmianie rozmiaru
    });
    canvas.addEventListener('click', handleCanvasClick);
    newGameBtn.addEventListener('click', init);
    modalNewGameBtn.addEventListener('click', init);

    // --- Start Gry ---
    init();

    // --- Rejestracja Service Workera dla PWA ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker zarejestrowany pomyślnie:', registration);
                })
                .catch(error => {
                    console.log('Rejestracja Service Workera nie powiodła się:', error);
                });
        });
    }
});