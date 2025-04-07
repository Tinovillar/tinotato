const PLAYER_ATTACKSPEED = 2;
const PLAYER_SIZE = 30;
const PLAYER_VELOCITY = 4;
const PLAYER_DAMAGE = 20;
const ENEMY_SPAWNRATE = 0.5;
const ENEMY_ATTACKSPEED = 4;
const ENEMY_SIZE = 25;
const ENEMY_VELOCITY = 3;
const ENEMY_DAMAGE = 5;
const ENEMY_MAX = 50;
const WAVE_DURATION = 20;
const PAUSED = 'paused', PLAYING = 'playing', UPGRADING = 'upgrading';

function keep_n_decimals(num, decimals) {
	return (Math.round(num * 100) / 100).toFixed(decimals);
}

class Game {
	constructor() {
		this.canvas = document.getElementById("canvas");
		this.ctx = this.canvas.getContext("2d");
		this.canvas.height = window.innerHeight;
		this.canvas.width = window.innerWidth;

		this.keys = new Set();

		this.points = 0;

		this.player = {
			x: window.innerWidth / 2, 
			y: window.innerHeight / 2, 
			size: PLAYER_SIZE, 
			life: 100, 
			maxLife: 100,
			armor: 0, 
			velocity: PLAYER_VELOCITY, 
			damage: PLAYER_DAMAGE, 
			attackSpeed: PLAYER_ATTACKSPEED, 
			range: 300
		};

		this.shoots = [];

		this.enemies = [];
		this.maxEnemies = ENEMY_MAX;
		this.enemyCooldown = ENEMY_SPAWNRATE;

		this.wave = 1;

		this.state = PLAYING; // Paused, Playing, Upgrading
		this.lastTime = 0;

		this.timer = 0;
		this.timeElapsed = 0;

		this.totalTime = 0;
		this.startTime = 0;

		this.gameLoop = this.gameLoop.bind(this);
	}
	init() {
		console.log("Initialize entities");
		window.addEventListener("keydown", e => {
			this.keys.add(e.key);
			if(this.state == UPGRADING) {
				if(e.key == '1') {
					this.player.attackSpeed *= 1.1;
					this.state = PLAYING;
				}
				if(e.key == '2') {
					this.player.damage *= 1.1;
					this.state = PLAYING;
				}
				if(e.key == '3') {
					this.player.maxLife = Math.round(this.player.maxLife * 1.1);
					this.player.life = this.player.maxLife;
					this.state = PLAYING;
				}
				if(e.key == '4') {
					this.player.velocity *= 1.05;
					this.state = PLAYING;
				}
				if(e.key == '5') {
					this.player.range *= 1.1;
					this.state = PLAYING;
				}
			} else if(e.key == 'p')
				this.state = this.state == PAUSED ? PLAYING : PAUSED;
		});
		window.addEventListener("keyup", e => {
			this.keys.delete(e.key);
		});
		document.addEventListener('contextmenu', function(event) {
		    event.preventDefault();
		});
	}
	restart() {
		this.enemies = [];
		this.enemyCooldown = ENEMY_SPAWNRATE;
		this.maxEnemies = 30;

		this.shoots = [];

		this.timer = 0;
		this.timeElapsed = 0;

		this.startTime = this.lastTime / 1000;
		this.totalTime = -1;

		this.player = {
			x: window.innerWidth / 2, 
			y: window.innerHeight / 2, 
			size: PLAYER_SIZE, 
			life: 100, 
			maxLife: 100,
			armor: 0, 
			velocity: PLAYER_VELOCITY, 
			damage: PLAYER_DAMAGE, 
			attackSpeed: PLAYER_ATTACKSPEED, 
			range: 300
		};
		this.wave = 1;
	}
	nextWave() {
		this.enemies = [];
		this.enemyCooldown *= 1.1;
		this.maxEnemies *= 1.2;

		this.shoots = [];

		this.timer = 0;
		this.timeElapsed = 0;

		this.startTime = this.lastTime / 1000;
		this.totalTime = -1;

		this.player.life = this.player.maxLife;
		this.player.x = window.innerWidth / 2;
		this.player.y = window.innerHeight / 2;

		this.wave += 1;
		this.state = UPGRADING;
	}
	gameLoop(timestamp) {
		if(!this.isRunning) return;

		const deltaTime = (timestamp - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = timestamp;
		this.totalTime += deltaTime;

        this.update(deltaTime);
        this.render();

		console.log("Iteration...");

        requestAnimationFrame(this.gameLoop);
	}
	start() {
		if(!this.isRunning) {
			this.isRunning = true;
			this.init();
			this.lastTime = performance.now();
			this.startTime = this.lastTime / 1000;
			this.totalTime = -1; // Initial delay
			requestAnimationFrame(this.gameLoop);
			console.log("Started...");
		}
	}
	update(deltatime) {
		// Check if is not playing
		if(this.state != PLAYING) return;
		// Update timer
		this.timer += deltatime;
		if(this.timer >= 1) {
			this.timeElapsed++;
			this.timer = 0;
		}
		// Check if round would be finished
		if(this.timer === 0 && this.timeElapsed === WAVE_DURATION) {
			this.nextWave();
		}
		// Update player position
		for(const key of this.keys) {
			if(key == 'a')
				this.player.x -= this.player.velocity;
			if(key == 'd')
				this.player.x += this.player.velocity;
			if(key == 'w')
				this.player.y -= this.player.velocity;
			if(key == 's')
				this.player.y += this.player.velocity;
		}
		// Spawn enemies
		if(this.enemies.length <= this.maxEnemies && Math.floor(this.totalTime / (1 / this.enemyCooldown)) > Math.floor((this.totalTime - deltatime) / (1 / this.enemyCooldown))) {
			this.enemies.push({ 
				x: Math.random() * this.canvas.width, 
				y: Math.random() * this.canvas.height, 
				damage: ENEMY_DAMAGE, 
				attackSpeed: ENEMY_ATTACKSPEED, 
				velocity: ENEMY_VELOCITY, 
				size: ENEMY_SIZE, 
				life: 100, 
				maxLife: 100
			});
		}
		// Update enemies position
		for(let enemy of this.enemies) {
			let dx = 0;
			let dy = 0;
			let distance = 0;
			dx = this.player.x - enemy.x;
			dy = this.player.y - enemy.y;
			distance = Math.sqrt(dx * dx + dy * dy);
			if(distance <= this.player.size && Math.floor(this.totalTime / (1 / enemy.attackSpeed)) > Math.floor((this.totalTime - deltatime) / (1 / enemy.attackSpeed))) {
				this.player.life -= enemy.damage;
				if(this.player.life <= 0) {
					this.restart();
					this.points = 0;
				}
			} else {
				let moveX = dx / distance;
				let moveY = dy / distance;
				enemy.x += moveX * enemy.velocity;
				enemy.y += moveY * enemy.velocity;
			}
			enemy.distance = distance;
		}
		// Sort by distance
		this.enemies.sort((a, b) => {
			return a.distance - b.distance;
		});
		// Shot to enemies
		if(this.enemies.length > 0 && Math.floor(this.totalTime / (1/this.player.attackSpeed)) > Math.floor((this.totalTime - deltatime) / (1/this.player.attackSpeed)) && this.enemies[0].distance < this.player.range) {
			this.shoots.push({
				x: this.player.x, 
				y: this.player.y, 
				target: this.enemies[0]
			});
		}
		// Update shoots positions
		for(let shoot of this.shoots) {
			let dx = 0;
			let dy = 0;
			let distance = 0;
			dx = shoot.target.x - shoot.x;
			dy = shoot.target.y - shoot.y;
			distance = Math.sqrt(dx * dx + dy * dy);
			if(distance < ENEMY_SIZE) {
				this.shoots = this.shoots.filter(s => s !== shoot);
				shoot.target.life -= this.player.damage;
				if(shoot.target.life <= 0 && this.enemies.includes(shoot.target)) {
					this.enemies = this.enemies.filter(e => e !== shoot.target);
					this.points++;
				}
			} else {
				let moveX = dx / distance;
				let moveY = dy / distance;
				shoot.x += moveX * 8;
				shoot.y += moveY * 8;
			}
		}
	}
	render() {
		// Clear screen
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		// Render screen
		this.ctx.fillStyle = 'black';
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		// Render wave count
		this.ctx.fillStyle = 'white';
		this.ctx.font = "bold 50px Arial";
        this.ctx.textAlign = 'center';
		this.ctx.fillText("Wave " + this.wave, this.canvas.width / 2, 100);
		// Render points
		this.ctx.fillStyle = 'white';
		this.ctx.font = "bold 25px Arial";
		this.ctx.fillText("Points: " + this.points, this.canvas.width / 2, 100 + 30);
		// Render paused screen
		if (this.state === PAUSED) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 100px Arial';
            this.ctx.fillText('Paused', this.canvas.width / 2, this.canvas.height / 2);
        } else if(this.state === PLAYING){
			// Render timer
			this.ctx.fillStyle = 'white';
			this.ctx.font = "bold 50px Arial";
			this.ctx.fillText(WAVE_DURATION - this.timeElapsed + " s", this.canvas.width/2, this.canvas.height/2);
			// Render player
			this.ctx.fillStyle = 'green';
			this.ctx.fillRect(this.player.x, this.player.y, this.player.size, this.player.size);
			// Render player life
			this.ctx.fillStyle = 'green';
			this.ctx.fillRect(50, 50, (this.player.life / 100) * 200, 50);
			this.ctx.fillStyle = 'white';
			this.ctx.font = "bold 25px Arial";
			this.ctx.fillText(`${this.player.life}/${this.player.maxLife}`, 150, 85);
			// Render player attack speed
			this.ctx.fillStyle = 'white';
			this.ctx.font = "bold 15px Arial";
			this.ctx.fillText("Attack speed: " + keep_n_decimals(this.player.attackSpeed, 2), 150, 120);
			// Render player damage
			this.ctx.fillStyle = 'white';
			this.ctx.font = "bold 15px Arial";
			this.ctx.fillText("Damage: " + keep_n_decimals(this.player.damage, 2), 150, 140);
			// Render player speed
			this.ctx.fillStyle = 'white';
			this.ctx.font = "bold 15px Arial";
			this.ctx.fillText("Speed: " + keep_n_decimals(this.player.velocity, 2), 150, 160);
			// Render player range
			this.ctx.fillStyle = 'white';
			this.ctx.font = "bold 15px Arial";
			this.ctx.fillText("Range: " + keep_n_decimals(this.player.range, 2), 150, 180);
			// Render enemies
			for(const enemy of this.enemies) {
				this.ctx.fillStyle = "blue";
				this.ctx.fillRect(enemy.x, enemy.y, enemy.size, enemy.size);
				this.ctx.fillStyle = 'orange';
				this.ctx.fillRect(enemy.x, enemy.y - 5, (enemy.life / 100) * enemy.size, 5);
			}
			// Render shoots
			for(const shoot of this.shoots) {
				this.ctx.fillStyle = 'red';
				this.ctx.fillRect(shoot.x, shoot.y, 10, 10);
			}
		} else if(this.state === UPGRADING) {
			// Render Upgrading screen
			this.ctx.globalAlpha = 0.8;
			this.ctx.fillStyle = "black"
			this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
			this.ctx.globalAlpha = 1.0;
			// Render Upgrading title
			this.ctx.fillStyle = 'white';
			this.ctx.font = "bold 50px Arial";
			this.ctx.fillText("Upgrade...", this.canvas.width/2, 250);
			// Render Upgrading options
			this.ctx.font = "20px Arial";
			this.ctx.fillText("1. Attack Speed" + " (+10%)", this.canvas.width/2, 350);
			this.ctx.fillText("2. Damage" + " (+10%)", this.canvas.width/2, 400);
			this.ctx.fillText("3. Life" + " (+10%)", this.canvas.width/2, 450);
			this.ctx.fillText("4. Speed" + " (+5%)", this.canvas.width/2, 500);
			this.ctx.fillText("5. Range" + " (+10%)", this.canvas.width/2, 550);
			// Option 1..7 (life, regeneration, speed, attackspeed, damage, armor, range)
		}
	}
	stop() {
		this.isRunning = false;
		console.log("Game stopped...");
	}
}

const game = new Game();
game.start();
