var ThreeRenderer = function()
{
	// INFO:
	// Klasse für Sphere erstellen (Room, -> enthält mehrere Marker (array) / MarkerManager möglich, hält array einzelne
	// Marker -> Estate enhält array von Rooms -> Room enthält MarkerHandler (DoorMarkerFactory) -> DoorMarkerFactory enthält array von DoorMarkers
	// http://www.dofactory.com/javascript/factory-method-design-pattern
	// Renderer
	console.log("Init Renderer");
	this.canvas 	= null;
	this.scene 		= null; 
	this.camera 	= null;
	this.renderer 	= null;

	// Additional Objects
	this.loader		= null;
	this.dirLight 	= null;
	this.cSizeX		= null;
	this.cSizeY 	= null;
	this.grid 		= null;

	// Scene Objects
	// Inner world sphere - switches texture
	this.innerspheregeometry = null;
	this.innerspherematerial = null;
	this.innerspheremesh = null;

	// Parameter for jump animation
	this.bodyPosition = null; 
	this.velocity = null;
	// Texture array which holds our panoramas
	this.panoramas = [6];
	// Count and switch the panorama (Key: Space)
	this.panocounter = 0;

	// Checks if input is allowed
	this.isUserInteracting = false;
	// Mouse position
	this.onMouseDownMouseX = 0;
	this.onMouseDownMouseY = 0;
	// Longitude
	this.lon = 0;
	// Latitude
	this.lat = 0;
	// Angle of twist
	this.phi = 0;
	this.theta = 0;
	this.onPointerDownPointerX = 0
	this.onPointerDownPointerY = 0;
	this.onPointerDownLon = 0;
	this.onPointerDownLat = 0;

	// Set controls
	this.isOrbitActive = true;

	// Raycaster
	this.mouse = new THREE.Vector2();
	this.lastMove = Date.now();
	this.raycaster = new THREE.Raycaster();

	// Init Three.js
	this.initTJS();

	// Init Rooms
	this.initRooms();

	var that = this;

	// document.addEventListener('mousedown', function (event){
	// 	that.onDocumentMouseDown(event, that)
	// }, false );

	document.addEventListener('mousedown', function (event){
		that.onDocumentMouseDown(event)
	}, false );

	document.addEventListener('mouseup',  function (event){
		that.onDocumentMouseUp(event)
	}, false );

	document.addEventListener('mousemove', function (event){
		that.onDocumentMouseMove(event)
	}, false );

	document.addEventListener('mousewheel', function (event){
		that.onDocumentMouseWheel(event)
	}, false );

	document.addEventListener('DOMMouseScroll', function (event){
		that.onDocumentMouseWheel(event)
	}, false );

	// Set update callback
	this.animate();
}

ThreeRenderer.prototype.initTJS = function()
{
	// Get canvas
	this.canvas = document.getElementById('myCanvasElement');

	// Create Scene
	this.scene = new THREE.Scene();

	// Init camera - standard perspective camera if rift is disabled
	this.cSizeX = 800;
	this.cSizeY = 600;
	this.camera = new THREE.PerspectiveCamera
	( 
		75, 
		//window.innerWidth / window.innerHeight,
		this.cSizeX / this.cSizeY, 
		1, 
		10000 
	);

	// Init renderer
	this.renderer = new THREE.WebGLRenderer
	({ 
		canvas 		: this.canvas,
		antialias	: true
	});
	this.renderer.setSize(this.cSizeX, this.cSizeY);
	this.renderer.setClearColor(0xFFFFFF);

	// Set inspectors (camera) position (to be on eye hight)
	if(this.isOrbitActive)
	{
		this.setOrbitControls();
	
		this.bodyPosition  		= new THREE.Vector3(0, 0, 350);
		this.camera.position.set( this.bodyPosition.x, this.bodyPosition.y, this.bodyPosition.z );
	}
	else 
	{
		this.bodyPosition  		= new THREE.Vector3(0, 15, 0);
		this.camera.position.set( this.bodyPosition.x, this.bodyPosition.y, this.bodyPosition.z );
		
		// TODO: Look at specific target when lauchning
		this.camera.target 		= new THREE.Vector3( 0, 0, -1 );
		this.camera.lookAt(this.camera.position, this.camera.target, new THREE.Vector3(1000,1,0));
		// console.log(this.camera.target);
	}

	// Hey may jump (later in VR ^^)
	this.velocity      		= new THREE.Vector3();

	// Set a light
	var dirLight = new THREE.DirectionalLight
	(
		0xffffff, 		// color
		1.0				// Intensity			
	);

	var pos = new THREE.Vector3 (1, 1, 0);
	dirLight.position.x = pos.x
	dirLight.position.y = pos.y;
	dirLight.position.z = pos.z;
	this.scene.add(dirLight);

	// var light = new THREE.AmbientLight( 0x404040, 3 );
	// scene.add( light );

	// Add world grid.
	var gridSettings = 
	{
		position 	: new THREE.Vector3( 0, 0, 0 ),
		size 		: 1000,
		segments 	: 100,
		name 		: 'WorldGrid',
		gridColor 	: 0x666666,
		borderColor : 0x666666,
		xAxisColor 	: 0xff4444,
		yAxisColor 	: 0x44ff44,
		zAxisColor 	: 0x4444ff,
		lineWidth 	: 10
	};

	// Grid interferes with raycaster fps cam
	if(this.isOrbitActive)
	{
		this.grid = new GridGenerator(this);
		this.scene.add(this.grid.createGrid(gridSettings));
	}
}

ThreeRenderer.prototype.initRooms = function ()
{
	this.room = new Room(this.scene);

	this.doorMarker = new DoorMarker
	(
		new THREE.Vector3(-80, -20, -175),	// Position
		new THREE.Vector3(-10, 30, 0), 		// Orientation
		new THREE.Vector3(2.5,3,1),			// Scale
		this.scene							// Scene
	);	

	this.doorMarker1 = new DoorMarker
	(
		new THREE.Vector3(180, -35, -45),	// Position
		new THREE.Vector3(0, 104 , 0),	// Orientation
		new THREE.Vector3(5.5,5,1),			// Scale
		this.scene							// Scene
	);	
}

ThreeRenderer.prototype.animate = function()
{
	if(!this.isOrbitActive)
	{
		this.lat = Math.max( -85, Math.min( 85, this.lat ) );
		this.phi = THREE.Math.degToRad( 90 - this.lat );
		this.theta = THREE.Math.degToRad( this.lon );

		// Set target to look at
		if(this.camera != 'undefined')
		{
			this.camera.target.x = 500 * Math.sin( this.phi ) * Math.cos( this.theta );
			this.camera.target.y = 500 * Math.cos( this.phi );
			this.camera.target.z = 500 * Math.sin( this.phi ) * Math.sin( this.theta );
		}

		this.camera.lookAt( this.camera.target );
	}

	// Resize
	this.cSizeX 		= 800; //(this.uploadPan.clientHeight / 3) * 4;
	this.cSizeY 		= 600; //this.uploadPan.clientHeight;
	this.camera.aspect 	= this.cSizeX / this.cSizeY;

	this.camera.updateProjectionMatrix();
	this.renderer.setSize(this.cSizeX, this.cSizeY);

	// Update the picking ray with the camera and mouse position
	this.raycaster.setFromCamera( this.mouse, this.camera );
	
	// Calculate objects intersecting the picking ray
	this.intersects = this.raycaster.intersectObjects( this.scene.children, false );
	
	if(this.intersects.length > 0)
	{
		if(this.intersects[0].object.geometry.type === 'PlaneGeometry')
			document.body.style.cursor = 'pointer';
		else 
			document.body.style.cursor = 'default';
	}

	requestAnimationFrame( ThreeRenderer.prototype.animate.bind (this) );

	this.render();
}

ThreeRenderer.prototype.render = function()
{	
	this.renderer.render( this.scene, this.camera );
}

ThreeRenderer.prototype.setOrbitControls = function()
{
	this.activeControls = new THREE.OrbitControls
	(
		this.camera,
		this.renderer.domElement
	);

	this.activeControls.rotateSpeed 		= 1.0;
	this.activeControls.enableDamping 		= true;
	this.activeControls.dampingFactor 		= 1.25;
	this.activeControls.zoomSpeed 			= 1.2;
	this.activeControls.keys 				= [ 65, 83, 68 ];

	this.activeControls.autoRotate 			= false;
	this.activeControls.autoRotateSpeed 	= 0.5;
};

// Update user input (mouse) if left or right mouse button is pressed
// Update user input (mouse) once if middle mouse button is pressed
// and switch panorama
ThreeRenderer.prototype.onDocumentMouseDown = function ( event ) 
{
	event.preventDefault();
	//console.log(event);
	//console.log(that);
	//console.log(this);

	//console.log(that.onPointerDownPointerX);
	switch(event.button)
	{
		case 0: // left
		this.isUserInteracting = true;

			// Update non THREE mouse controls on button press
			if(!this.isOrbitActive)
			{
				this.onPointerDownPointerX = event.clientX;
				this.onPointerDownPointerY = event.clientY;
			
				this.onPointerDownLon = this.lon;
				this.onPointerDownLat = this.lat;
			}

			// Get mouse position between -1 and 1 for both axis
			this.mouse = this.updateMouseVector(event);

			// Update the picking ray with the camera and mouse position
			this.raycaster.setFromCamera( this.mouse, this.camera );

			// Calculate objects intersecting the picking ray
			this.intersects = this.raycaster.intersectObjects( this.scene.children, true );
			
			if(this.intersects.length > 0)
			{
				if(this.intersects[0].object.geometry.type === 'PlaneGeometry')
				{
					console.log(this.intersects[0]);
					this.intersects[0].object.material.color.set( 0xff0000 );
					this.panocounter++;
		
					if(this.panocounter > 6) 
						this.panocounter = 0; 
		
					// Switch panoramas
					console.log(this.innerspheremesh);
					this.room.sphereMat.map = THREE.ImageUtils.loadTexture(this.room.panoramas[this.panocounter]);
					this.room.sphereMat.needUpdate = true;
		
					console.log('Src in panoramas : ' + this.room.panoramas[this.panocounter]);
					console.log('Panocounter: ' + this.panocounter);
				}
			}
			
			break;

		case 1: // middle
			// Switch between panoramas
			console.log(this.camera);
			this.panocounter++;

			if(this.panocounter > 6) 
				this.panocounter = 0; 

			// Switch panoramas
			console.log(this.innerspheremesh);
			this.room.sphereMat.map = THREE.ImageUtils.loadTexture(this.room.panoramas[this.panocounter]);
			this.room.sphereMat.needUpdate = true;

			console.log('Src in panoramas : ' + this.room.panoramas[this.panocounter]);
			console.log('Panocounter: ' + this.panocounter);
			break;

		case 2: // right
		//riftEnabled = true;
			break;
	}
}

// Lock user input (mouse) once if button was released
ThreeRenderer.prototype.onDocumentMouseUp = function( event ) 
{
	this.isUserInteracting = false;
}

// While lift mouse button is pressed, update mouse user input
ThreeRenderer.prototype.onDocumentMouseMove = function( event )
{
	// if (Date.now() - this.lastMove < 60) { // 32 frames a second
    //     return;
    // } else {
    //     this.lastMove = Date.now();
	// }

	// Update non THREE mouse controls on mouse move
	if (this.isUserInteracting && !this.isOrbitActive) 
	{
		this.lon = ( this.onPointerDownPointerX - event.clientX ) * 0.1 + this.onPointerDownLon;
		this.lat = ( event.clientY - this.onPointerDownPointerY ) * 0.1 + this.onPointerDownLat;
	}

	// Get mouse position between -1 and 1 for both axis
	this.mouse = this.updateMouseVector(event);
}

// Update user input from mouse wheel
ThreeRenderer.prototype.onDocumentMouseWheel = function( event ) 
{
	// WebKit
	if ( event.wheelDeltaY ) 
	{
		this.camera.fov -= event.wheelDeltaY * 0.05;
		console.log(this.camera.fov);
		// fovrange -= event.wheelDeltaY * 0.05;
		// fovscale -= event.wheelDeltaY * 0.0005;
		// console.log("Increased RiftFOV by : " + fovscale);
		// console.log("Increased FOV by : " + fovrange);
		// console.log("FOV : " + finalfov);

	// Opera / Explorer 9
	} 
	else if ( event.wheelDelta ) 
	{
		this.camera.fov -= event.wheelDelta * 0.05;
		// fovrange -= event.wheelDelta * 0.05;
		// fovscale -= event.wheelDelta * 0.0005;
		// console.log("Increased RiftFOV by : " + fovscale);
		// console.log("Increased FOV by : " + fovrange);
		// console.log("FOV : " + finalfov);

	// Firefox
	}
	else if ( event.detail ) 
	{
		this.camera.fov += event.detail * 1.0;
		// fovrange += event.detail * 1.0;
		// fovscale += event.detail * 0.01;
		// console.log("Increased RiftFOV by : " + fovscale);
		// console.log("Increased FOV by : " + fovrange);
		// console.log("FOV : " + finalfov);

	} // end if mouse wheel

	// Update projection with new FOV
	this.camera.updateProjectionMatrix();
	//riftCam = new THREE.OculusRiftEffect(renderer);
}

ThreeRenderer.prototype.updateMouseVector = function( event )
{
	// Init vector2D for mouse
	var mouse = new THREE.Vector2(0,0,0);

	// Get scroll offset by the different browsers
	var scrollOffsetX = (window.pageXOffset ||
						 window.scrollX     ||
						 document.documentElement.scrollLeft);

	var scrollOffsetY = (window.pageYOffset ||
						 window.scrollY     || 
						 document.documentElement.scrollTop);

	// Get mouse position inside render area in dependence of the scroll offset
	mouse.x     = event.clientX - this.canvas.offsetLeft + scrollOffsetX;
	mouse.y     = event.clientY - this.canvas.offsetTop  + scrollOffsetY;

	// Normalize mouse coordinates
	mouse.x     /= this.canvas.width;
	mouse.y     /= this.canvas.height;

	// MouseVec to normalVec: maps mouse vector from [0, 1] to [-1, 1]
	mouse.x     =   mouse.x * 2  - 1;
	mouse.y     = -(mouse.y * 2) + 1;

	return mouse;
}
