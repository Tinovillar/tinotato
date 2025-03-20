const PLAYER_MOBILE_VELOCITY = 3.5;
const PLAYER_MOBILE_SIZE = 20;
const PLAYER_MOBILE_ATTACKSPEED = 0.2;
const PLAYER_ATTACKSPEED = 0.1;
const PLAYER_SIZE = 30;
const PLAYER_VELOCITY = 5;
const PLAYER_DAMAGE = 20;
const ENEMY_MOBILE_VELOCITY = 2;
const ENEMY_MOBILE_SIZE = 17;
const ENEMY_MOBILE_SPAWNRATE = 1.5;
const ENEMY_SPAWNRATE = 0.5;
const ENEMY_SIZE = 25;
const ENEMY_VELOCITY = 3;
const PAUSED = 'paused', PLAYING = 'playing', UPGRADING = 'upgrading';

function isMobile() {
	return window.innerWidth <= 800;
}

class Game {
	constructor() {
		this.canvas = document.getElementById("canvas");
		this.ctx = this.canvas.getContext("2d");
		this.canvas.height = window.innerHeight;
		this.canvas.width = window.innerWidth;

		this.keys = new Set();
		this.joystick = nipplejs.create({
	        zone: document.getElementById('static'), 
			mode: 'static', 
			position: {left: '50%', top: '50%'}, 
			size: 100, 
	        color: 'blue'
	    });

		this.points = 0;

		this.player = {
			x: window.innerWidth / 2, 
			y: window.innerHeight / 2, 
			size: isMobile() ? PLAYER_MOBILE_SIZE : PLAYER_SIZE, 
			life: 100, 
			armor: 0, 
			velocity: isMobile() ? PLAYER_MOBILE_VELOCITY : PLAYER_VELOCITY, 
			damage: PLAYER_DAMAGE, 
			attackSpeed: 0.1, 
			range: 300
		};

		this.shoots = [];
		this.shootTimer = 0;
		this.shootCooldown = isMobile() ? PLAYER_MOBILE_ATTACKSPEED : PLAYER_ATTACKSPEED; // 500ms

		this.enemies = [];
		this.enemyTimer = 0;
		this.enemyCooldown = isMobile() ? ENEMY_MOBILE_SPAWNRATE : ENEMY_SPAWNRATE;
		this.maxEnemies = 30;

		this.wave = 1;

		this.state = PLAYING; // Paused, Playing, Upgrading
		this.lastTime = 0;

		this.timer = 0;
		this.timeElapsed = 0;
		this.timeLimit = 20;

		this.gameLoop = this.gameLoop.bind(this);
	}
	init() {
		console.log("Initialize entities");
		window.addEventListener("keydown", e => {
			this.keys.add(e.key);
			if(this.state == UPGRADING) {
				if(e.key == '1') {
					this.player.attackSpeed *= 0.8;
					this.state = PLAYING;
				}
				if(e.key == '2') {
					this.player.damage *= 1.1;
					this.state = PLAYING;
				}
				if(e.key == '3') {
					this.player.life = Math.round(this.player.life * 1.1);
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
		this.joystick.on('move', (event, data) => {
			if(data.direction) {
				switch(data.direction.angle) {
					case "left":
						this.lastMovement = 'a';
						this.keys.add(this.lastMovement);
						break;
					case "right":
						this.lastMovement = 'd';
						this.keys.add(this.lastMovement);
						break;
					case "up":
						this.lastMovement = 'w';
						this.keys.add(this.lastMovement);
						break;
					case "down":
						this.lastMovement = 's';
						this.keys.add(this.lastMovement);
						break;
				}
			}
		});
		this.joystick.on('end', () => {
			this.keys.clear();
		})
		document.addEventListener('contextmenu', function(event) {
		    event.preventDefault();
		});
	}
	restart() {
		this.enemies = [];
		this.enemyTimer = 0;
		this.enemyCooldown = isMobile() ? ENEMY_MOBILE_SPAWNRATE : ENEMY_SPAWNRATE;
		this.maxEnemies = 30;

		this.shoots = [];
		this.shootTimer = 0;

		this.timer = 0;
		this.timeElapsed = 0;

		this.player.life = 100;
		this.player.x = window.innerWidth / 2;
		this.player.y = window.innerHeight / 2;
		this.wave = 1;
	}
	nextWave() {
		this.enemies = [];
		this.enemyTimer = 0;
		this.enemyCooldown *= 0.9;
		this.maxEnemies *= 1.2;

		this.shoots = [];
		this.shootTimer = 0;

		this.timer = 0;
		this.timeElapsed = 0;

		this.player.life = 100;
		this.player.x = window.innerWidth / 2;
		this.player.y = window.innerHeight / 2;

		this.wave += 1;
		this.state = UPGRADING;
	}
	gameLoop(timestamp) {
		if(!this.isRunning) return;

		const deltaTime = (timestamp - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = timestamp;

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
		if(this.timer === 0 && this.timeElapsed === this.timeLimit) {
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
		this.enemyTimer += deltatime;
		if(this.enemies.length <= this.maxEnemies && this.enemyTimer >= this.enemyCooldown) {
			this.enemies.push({x: Math.random() * this.canvas.width, y: Math.random() * this.canvas.height, velocity: isMobile() ? ENEMY_MOBILE_VELOCITY : ENEMY_VELOCITY, size: isMobile() ? ENEMY_MOBILE_SIZE : ENEMY_SIZE, life: 100});
			this.enemyTimer = 0;
		}
		// Update enemies position
		for(let enemy of this.enemies) {
			let dx = 0;
			let dy = 0;
			let distance = 0;
			dx = this.player.x - enemy.x;
			dy = this.player.y - enemy.y;
			distance = Math.sqrt(dx * dx + dy * dy);
			if(distance <= this.player.size) {
				this.player.life -= 5;
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
		this.shootTimer += deltatime;
		if(this.enemies.length > 0 && this.shootTimer >= this.player.attackSpeed && this.enemies[0].distance < this.player.range) {
			this.shoots.push({x: this.player.x, y: this.player.y, target: this.enemies[0]});
			this.shootTimer = 0;
		}
		// Update shoots positions
		for(let shoot of this.shoots) {
			let dx = 0;
			let dy = 0;
			let distance = 0;
			dx = shoot.target.x - shoot.x;
			dy = shoot.target.y - shoot.y;
			distance = Math.sqrt(dx * dx + dy * dy);
			if(distance < 15) {
				this.shoots = this.shoots.filter(s => s !== shoot);
				shoot.target.life -= 25;
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
			this.ctx.fillText(this.timeElapsed + " s", this.canvas.width/2, this.canvas.height/2);
			// Render player
			this.ctx.fillStyle = 'green';
			this.ctx.fillRect(this.player.x, this.player.y, this.player.size, this.player.size);
			// Render player life
			this.ctx.fillStyle = 'green';
			this.ctx.fillRect(50, 50, (this.player.life / 100) * 200, 50);
			this.ctx.fillStyle = 'white';
			this.ctx.font = "bold 25px Arial";
			this.ctx.fillText(this.player.life, 150, 85);
			// Render player attack speed
			this.ctx.fillStyle = 'white';
			this.ctx.font = "bold 15px Arial";
			this.ctx.fillText("Attack speed: " + this.player.attackSpeed, 150, 120);
			// Render player damage
			this.ctx.fillStyle = 'white';
			this.ctx.font = "bold 15px Arial";
			this.ctx.fillText("Damage: " + this.player.damage, 150, 140);
			// Render player attack speed
			this.ctx.fillStyle = 'white';
			this.ctx.font = "bold 15px Arial";
			this.ctx.fillText("Speed: " + this.player.velocity, 150, 160);
			// Render player attack speed
			this.ctx.fillStyle = 'white';
			this.ctx.font = "bold 15px Arial";
			this.ctx.fillText("Range: " + this.player.range, 150, 180);
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
			this.ctx.fillText("1. Attack Speed", this.canvas.width/2, 350);
			this.ctx.fillText("2. Damage", this.canvas.width/2, 400);
			this.ctx.fillText("3. Life", this.canvas.width/2, 450);
			this.ctx.fillText("4. Speed", this.canvas.width/2, 500);
			this.ctx.fillText("5. Range", this.canvas.width/2, 550);
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
