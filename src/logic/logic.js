var canvas = document.querySelector('canvas');
var ctx = canvas.getContext("2d");

var socket = io();

var Logic = {

    // Character movement, collision, attacking, and dodging mechanics function objects will go here
    rightPressed: false,
    leftPressed: false,
    upPressed: false,
    downPressed: false,
    mousePressed: false,
    spacePressed: false,
    shiftPressed: false,
    canvasMousePosition: {},
    mousePositionFromPlayer: {},

    character: function(options) {
        this.camera = options.camera;
        this.sprite = options.sprite;

        this.speed = options.speed;
        this.maxSpeed = options.maxSpeed;
        this.minSpeed = options.minSpeed;

        this.maxStamina = 100;
        this.curStamina = this.maxStamina;

        this.canDodge = true;
        this.canShoot = true;
        
        this.curArrowTimer = 0;
        this.arrowTimer = 60;
        this.arrowCount = 100;

        this.score = 0;
        this.rank = 0;

        this.origin = {x: 0, y: 0},

        this.update = function() {
            this.move();
            this.sprint();
            this.dodge();
            this.bound();
            this.createArrow();
            this.setOrigin();
        }
        this.move = function() {
            //face right: index0 right movement: index1,index2
            if(Logic.rightPressed) {
                this.sprite.animate(1, 2, 10, 'loop');
                this.sprite.x += this.speed;
            }
            //face left: index3 left movement: index4,index5
            if(Logic.leftPressed) {
                this.sprite.animate(4, 5, 10, 'loop');
                this.sprite.x -= this.speed;
            }
            //face up: index9 upward movement: index10,index11
            if(Logic.upPressed) {
                this.sprite.animate(10, 11, 10, 'loop');
                this.sprite.y -= this.speed;
            }
            //face down: index6 downward movement: index7,index8
            if(Logic.downPressed) {
                this.sprite.animate(7, 8, 10, 'loop');
                this.sprite.y += this.speed;
            }
        }
        this.sprint = function() {
            //sprint while draining stamina but cannot shoot
            if(Logic.shiftPressed) {
                var i = this.curStamina;
                while (i >= 0) {
                    if (this.speed > this.maxSpeed) {
                        this.speed = this.maxSpeed;
                    }
                    else {
                    Logic.mousePressed = false; //may be buggy
                    this.speed += 0.01;
                    this.curStamina = i;
                    i--;
                        }
                    }
                }
                //otherwise recharge stamina to max 100
            else if(Logic.shiftPressed == false && Logic.spacePressed == false && this.curStamina <= this.maxStamina) { //BUG: cannot move until stamina = 100
                var i = this.curStamina;
                this.speed = this.minSpeed; //make this decelerate?
                while (i <= this.maxStamina) {
                    i++; //make this slower
                    this.curStamina = i;
                }
            }
        }
        this.dodge = function(){ //BUG: should not be able to hold down space; make instant press
            if (Logic.spacePressed) {
                if (this.canDodge == true && this.curStamina >= 50) {
                    this.speed += 10;
                    this.curStamina -= 50;
                    this.canDodge = false;
                }
                else {
                    this.speed = this.minSpeed;
                }
            }
            else {
                this.canDodge = true;
            }
        }
        this.bound = function() {
            if(this.sprite.x - this.sprite.width/2 < 0){
                this.sprite.x = this.sprite.width/2;
            }
            if(this.sprite.y - this.sprite.height/2 < 0){
                this.sprite.y = this.sprite.height/2;
            }
            if(this.sprite.x + this.sprite.width + (this.sprite.width/2) > mapWidth){
                this.sprite.x = mapWidth - this.sprite.width - (this.sprite.width/2);
            }
            if(this.sprite.y + this.sprite.height + (this.sprite.height/2) > mapHeight){
                this.sprite.y = mapHeight - this.sprite.height - (this.sprite.height/2);
            }
        }
        this.createArrow = function () {
            this.curArrowTimer++;
            if(this.curArrowTimer > this.arrowTimer) {
                this.canShoot = true;
                this.curArrowTimer = this.arrowTimer;
            }

            //creates arrow to shoot
			if(Logic.mousePressed && this.canShoot && this.arrowCount > 0) {
                //calculate direction to shoot arrow
                var deltaX = this.origin.x;
                var deltaY = this.origin.y;

                var speed = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
                var maxSpeed = 3;

                var angle = Math.atan2(Logic.canvasMousePosition.x - (canvas.width / 2),-(Logic.canvasMousePosition.y - (canvas.height / 2))) * (180/Math.PI);

                var timestamp = new Date().getUTCMilliseconds(); //time in milliseconds
                var idString = Math.random().toString(36).substring(7); //random 5 letter string
                
                if(speed > maxSpeed) {
                    var speedRatio = speed / maxSpeed;
                    deltaX = deltaX / speedRatio;
                    deltaY = deltaY / speedRatio;
                }

				//create initial arrow
				var arrow =  new Logic.arrow({
                    id: 'arrow-' + idString + timestamp, // gives the arrow a random ID (EXAMPLE ID: arrow-cabde716)
                    belongsTo: globalClientId,
                    isInThisRoom: globalRoomId,
                    angle: angle,
                    lifetime: 100,
					sprite: new Renderer.Sprite({
                        image: Renderer.Images.arrow,
                        width: 16,
                        height: 16,
                        isSpriteSheet: true,
                        x: this.sprite.x,  // set initial position of arrow to player position
                        y: this.sprite.y,
                        index: 0
                    }),
                    arrowSpeedX: deltaX,
				    arrowSpeedY: deltaY
				});
				
                socket.emit('AddArrowData', arrow); //send arrow object to server 
                this.arrowCount--;
                this.canShoot = false;
                this.curArrowTimer = 0;
			}
        }
        this.setOrigin = function() {

            if(this.camera.isClamped.x == 0) {
                this.origin.x = (this.sprite.x - ((canvas.width/5)/2)) + (Logic.mousePositionFromPlayer.x - this.sprite.x) - 8;
            } 
            else if(this.camera.isClamped.x == 1) {
                this.origin.x = Logic.mousePositionFromPlayer.x - this.sprite.x - 8;
            }
            else if(this.camera.isClamped.x == 2) {
                this.origin.x = (mapWidth - (canvas.width/5)) + (Logic.mousePositionFromPlayer.x - this.sprite.x) - 8;
            }

            if(this.camera.isClamped.y == 0) {
                this.origin.y = (this.sprite.y - ((canvas.height/5)/2)) + (Logic.mousePositionFromPlayer.y - this.sprite.y) - 8;
            } 
            else if(this.camera.isClamped.y == 1) {
                this.origin.y = Logic.mousePositionFromPlayer.y - this.sprite.y - 8;
            }
            else if(this.camera.isClamped.y == 2) {
                this.origin.y = (mapHeight - (canvas.height/5)) + (Logic.mousePositionFromPlayer.y - this.sprite.y) - 8;
            }
        }
    },

    arrow: function(options) {
        this.sprite = options.sprite;

        this.id = options.id;
		
        this.arrowSpeedX = options.arrowSpeedX;
        this.arrowSpeedY = options.arrowSpeedY;   
        this.angle = options.angle;
		
		this.belongsTo = options.belongsTo; //which player the arrow belongs to
        this.isInThisRoom = options.isInThisRoom; //which room the arrow is in
        
        this.lifetime = options.lifetime;
    },
    leaderboard: function(options) {
        this.playerList = [];
        this.isFirst = ''; //check if player is first place
        this.isHit = ''; //check if player is hit by arrow
        
        this.update = function() {
          this.addPlayer();
          //this.addScore();
          this.sortRank();
        }
        this.addPlayer = function(player) {
            //update leaderboard with playerList array when player joins or leaves
            this.playerList.push({
                playerName: player.name,
                playerId: player.id,
                score: 0,
                rank: 0
            });
        }
        this.addScore = function (playerKiller, playerKilled) {
            //calculate and add player score
            //socket.emit('AddScore', amount)
            //bonus points for hitting top player -- steal half of top player score
            playerKiller.score++;
            if (playerKilled.rank == 1) {
                playerKiller.score = (playerKilled.score/2) + playerKiller.score;
            }
        }
        this.sortRank = function () {
            //calculate and change player ranking with quick sort
            var i = playerList[0]; //left
            var j = playerList.length; //right
            var pivot = playerList[Math.floor((j + i) / 2)];

            while (i <= j) {
                while (playerList[i] < pivot) {
                    i++; //move right
                }
                while (playerList[j] > pivot) {
                    j--; //move left
                }
                if (i <= j) { //when i and j meet
                    swap(playerList, i, j); //perform sort
                    i++;
                    j--;
                }
            }
            return i;
        }
    },
    keyDownHandler: function(e) {
        if(e.keyCode == Controls.rightKey) {
            Logic.rightPressed = true;
        }
        if(e.keyCode == Controls.leftKey) {
            Logic.leftPressed = true;
        }
        if(e.keyCode == Controls.upKey) {
            Logic.upPressed = true;
        }
        if(e.keyCode == Controls.downKey) {
            Logic.downPressed = true;
        }
        if (e.keyCode == Controls.spaceKey) {
            Logic.spacePressed = true;
        }
        if (e.keyCode == Controls.shiftKey){
            Logic.shiftPressed = true;
        }
    },
    keyUpHandler: function(e) {
        if(e.keyCode == Controls.rightKey) {
            Logic.rightPressed = false;
        }
        if(e.keyCode == Controls.leftKey) {
            Logic.leftPressed = false;
        }
        if(e.keyCode == Controls.upKey) {
            Logic.upPressed = false;
        }
        if(e.keyCode == Controls.downKey) {
            Logic.downPressed = false;
        }
        if (e.keyCode == Controls.spaceKey) {
            Logic.spacePressed = false;
        }
        if (e.keyCode == Controls.shiftKey){
            Logic.shiftPressed = false;
        }
    },
    mouseDownHandler: function(e) {
        if (e.button == Controls.leftClick) {
            Logic.mousePressed = true;
        }
    },
    mouseUpHandler: function(e) {
        if (e.button == Controls.leftClick) {
            Logic.mousePressed = false;
        }
    },
    getMousePosition: function (e) {
        var mouseX = e.clientX - ctx.canvas.offsetLeft;
        var mouseY = e.clientY - ctx.canvas.offsetTop;
        
        var canvasMousePos = {
            x: e.clientX,
            y: e.clientY
        }

        var mousePositionFromPlayer = {
            x: (mouseX * (canvas.width/5) / canvas.clientWidth),
            y: (mouseY * (canvas.height/5) / canvas.clientHeight)
        }

        Logic.mousePositionFromPlayer = mousePositionFromPlayer;
        Logic.canvasMousePosition = canvasMousePos;
    },
    collision: function (object1, object2) { //FIX
        if (object1.x < object2.x + object2.width &&
        object1.x + object1.width > object2.x &&
        object1.y < object2.y + object2.height &&
        object1.y + object1.height > object2.y) {
            canCollide = true;
        }
        else {
            canCollide = false;
        }
    },
}


// Manual browser testing functions will go here
document.addEventListener("keydown", Logic.keyDownHandler, false); //up, down, left, right, space, shift
document.addEventListener("keyup", Logic.keyUpHandler, false);

document.addEventListener("mousedown", Logic.mouseDownHandler, false); //mouse click
document.addEventListener("mouseup", Logic.mouseUpHandler, false);

document.addEventListener("mousemove", Logic.getMousePosition, false); //mouse movement