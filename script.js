const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0;
let best = 0;
let gameRunning = false;

const sc = document.getElementById("sc");
const bs = document.getElementById("bs");

document.getElementById("play-btn").onclick = startGame;
document.getElementById("retry-btn").onclick = startGame;

function startGame() {
  score = 0;
  gameRunning = true;

  document.getElementById("title").classList.add("off");
  document.getElementById("result").classList.add("off");
  document.getElementById("ui").style.display = "flex";

  loop();
}

function loop() {
  if (!gameRunning) return;

  ctx.fillStyle = "#0d0020";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  score++;
  sc.textContent = score;

  if (score > best) {
    best = score;
    bs.textContent = best;
  }

  requestAnimationFrame(loop);
}

// simple game over after some time
setInterval(() => {
  if (gameRunning && score > 200) {
    gameRunning = false;

    document.getElementById("result").classList.remove("off");
    document.getElementById("res-info").innerText =
      "Score: " + score + " | Best: " + best;
  }
}, 3000);