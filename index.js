class Game {
	constructor() {
		this.canvas = document.getElementById("canvas");
		this.ctx = this.canvas.getContext("2d");
		this.canvas.height = window.innerHeight;
		this.canvas.width = window.innerWidth;

		this.keys = new Set();

		this.player = {x: 0, y: 0, life: 100, armor: 0, velocity: 5, damage: 20, attackSpeed: 0.1};
		this.shoots = [];
		this.shootTimer = 0;
		this.shootCooldown = 0.1; // 500ms

		this.enemies = [];
		this.enemyTimer = 0;
		this.enemyCooldown = 0.5; // 100ms
		this.maxEnemies = 30;

		this.wave = 1;

		this.paused = false;
		this.isRunning = false;
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
			if(e.key == 'p')
				this.paused = !this.paused;
		});
		window.addEventListener("keyup", e => {
			this.keys.delete(e.key);
		});
	}
	restart() {
		this.enemies = [];
		this.enemyTimer = 0;

		this.shoots = [];
		this.shootTimer = 0;

		this.timer = 0;
		this.timeElapsed = 0;

		this.player.life = 100;
		this.wave = 1;
	}
	nextWave() {
		let lastWave = this.wave;
		this.restart();
		this.wave = lastWave + 1;
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
		// Pause game
		if(this.paused) return;
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
			this.enemies.push({x: Math.random() * this.canvas.width, y: Math.random() * this.canvas.height, life: 100});
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
			if(distance <= 30) {
				this.player.life -= 5;
				if(this.player.life <= 0) {
					this.restart();
				}
			} else {
				let moveX = dx / distance;
				let moveY = dy / distance;
				enemy.x += moveX * 3;
				enemy.y += moveY * 3;
			}
			enemy.distance = distance;
		}
		// Sort by distance
		this.enemies.sort((a, b) => {
			return a.distance - b.distance;
		});
		// Shot to enemies
		this.shootTimer += deltatime;
		if(this.enemies.length > 0 && this.shootTimer >= this.shootCooldown && this.enemies[0].distance < 400) {
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
				if(shoot.target.life <= 0) {
					this.enemies = this.enemies.filter(e => e !== shoot.target);
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
		// Render paused screen
		if (this.paused) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 100px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Paused', this.canvas.width / 2, this.canvas.height / 2);
        } else {
			// Render timer
			this.ctx.fillStyle = 'white';
			this.ctx.font = "bold 50px Arial";
			this.ctx.fillText(this.timeElapsed + " s", this.canvas.width/2, this.canvas.height/2);
		}
		// Render wave
		this.ctx.fillStyle = 'white';
		this.ctx.font = "bold 50px Arial";
		this.ctx.fillText("Wave " + this.wave, this.canvas.width/2, 100);
		// Render player
		this.ctx.fillStyle = 'green';
		this.ctx.fillRect(this.player.x, this.player.y, 30, 30);
		this.ctx.fillStyle = 'orange';
		this.ctx.fillRect(this.player.x, this.player.y - 5, (this.player.life / 100) * 30, 5);
		// Render enemies
		for(const enemy of this.enemies) {
			this.ctx.fillStyle = "blue";
			this.ctx.fillRect(enemy.x, enemy.y, 25, 25);
			this.ctx.fillStyle = 'orange';
			this.ctx.fillRect(enemy.x, enemy.y - 5, (enemy.life / 100) * 25, 5);
		}
		// Render shoots
		for(const shoot of this.shoots) {
			this.ctx.fillStyle = 'red';
			this.ctx.fillRect(shoot.x, shoot.y, 10, 10);
		}
	}
	stop() {
		this.isRunning = false;
		console.log("Game stopped...");
	}
}

const game = new Game();
game.start();
