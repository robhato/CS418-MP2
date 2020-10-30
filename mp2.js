
/**
 * @file A simple WebGL example drawing central Illinois style terrain
 * @author Eric Shaffer <shaffer1@illinois.edu>  
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The Modelview matrix */
var mvMatrix = glMatrix.mat4.create();

/** @global The Projection matrix */
var pMatrix = glMatrix.mat4.create();

/** @global The Normal matrix */
var nMatrix = glMatrix.mat3.create();

/** @global A glMatrix vector to use for transformations */
var transformVec = glMatrix.vec3.create();    

// Initialize the vector....
glMatrix.vec3.set(transformVec,0.0,-0.25,-2.0);

/** @global An object holding the geometry for a 3D terrain */
var myTerrain;


// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = glMatrix.vec3.fromValues(0.0,-0.1,-1.2);
/** @global Direction of the view in world coordinates */
var viewDir = glMatrix.vec3.fromValues(0.0,-0.25,-1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = glMatrix.vec3.fromValues(0.0,1.0,0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = glMatrix.vec3.fromValues(0.0,0.0,0.0);

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [0,3,3];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0,0,0];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1,1,1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[0,0,0];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0,1.0,1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kTerrainDiffuse = [205.0/255.0,163.0/255.0,63.0/255.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [0.0,0.0,0.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 23;
/** @global Edge color fpr wireframeish rendering */
var kEdgeBlack = [0.0,0.0,0.0];
/** @global Edge color for wireframe rendering */
var kEdgeWhite = [1.0,1.0,1.0];

//Fog Parameter
/** Boolean defining if the fog is turned on or not (on by default) */
var fogOn = true;

//Airplane Parameters
/** Stores currently pressed key on keyboard */
var currentPressedKey = {};
/** Stores rotation quaternion */
var quatRot = glMatrix.quat.create();
/** Stores direction in which plane is moving */
var directionVec = glMatrix.vec3.create();
/** Defines speed of plane */
var speed = 0.001;



//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  glMatrix.mat3.fromMat4(nMatrix,mvMatrix);
  glMatrix.mat3.transpose(nMatrix,nMatrix);
  glMatrix.mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var context = null;
  context = canvas.getContext("webgl");
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
    
  var shaderSource = shaderScript.text;
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader; 
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
  shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess");    
  shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKAmbient");  
  shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKDiffuse");
  shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKSpecular");
  // adding min and max z uniforms
  shaderProgram.uniformMaxZ = gl.getUniformLocation(shaderProgram, "maxZ");
  shaderProgram.uniformMinZ = gl.getUniformLocation(shaderProgram, "minZ");
  // adding FogCheck
  shaderProgram.uniformFogLoc = gl.getUniformLocation(shaderProgram, "uFogOn");
}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 */
function setMaterialUniforms(alpha,a,d,s) {
  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function setLightUniforms(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * Sends fog values to shader
 * @param {Bool} fogOn
 */

function setFogOnUniform(fogOn) {
    gl.uniform1i(shaderProgram.uniformFogLoc, fogOn);
}

//-------------------------------------------------------------------------
/**
 * Sends Z values to shader
 * @param {Float32} maxZ
 * @param {Float32} minZ
 */

function setupZUniforms(maxZ, minZ) {
    gl.uniform1f(shaderProgram.uniformMaxZ, maxZ);
    gl.uniform1f(shaderProgram.uniformMinZ, minZ);
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupBuffers() {
    myTerrain = new Terrain(300,-2.0,2.0,-2.0,2.0);
    myTerrain.loadBuffers();
}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() { 
    //console.log("function draw()")
    //var transformVec = glMatrix.vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    glMatrix.mat4.perspective(pMatrix,degToRad(45), 
                     gl.viewportWidth / gl.viewportHeight,
                     0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction    
    glMatrix.vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    glMatrix.mat4.lookAt(mvMatrix,eyePt,viewPt,up);    
 
    //Draw Terrain
    //glMatrix.vec3.set(transformVec,0.0,-0.5,-2.1);
    glMatrix.mat4.translate(mvMatrix, mvMatrix,transformVec);
    glMatrix.mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75));
    setMatrixUniforms();
    setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular);
    // making sure new shader values are drawn in terrain
    setupZUniforms(myTerrain.maxZ, myTerrain.minZ);
    // same with fog values
    setFogOnUniform(fogOn);
    
    if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked))
    { 
      setMaterialUniforms(shininess,kAmbient,kTerrainDiffuse,kSpecular); 
      myTerrain.drawTriangles();
    }
    
    if(document.getElementById("wirepoly").checked)
    {
      setMaterialUniforms(shininess,kAmbient,kEdgeBlack,kSpecular);
      myTerrain.drawEdges();
    }

    if(document.getElementById("wireframe").checked)
    {
      setMaterialUniforms(shininess,kAmbient,kEdgeWhite,kSpecular);
      myTerrain.drawEdges();
    }
    
    //requestAnimationFrame(draw); 
  
}

//----------------------------------------------------------------------------------
/**
 * Animation function for airplane movement
 */

function animate() {
    var pitch = 0;
    var roll = 0;
    
    if (currentPressedKey["ArrowRight"]) roll += degToRad(1);
    if (currentPressedKey["ArrowLeft"]) roll -= degToRad(1);
    if (currentPressedKey["ArrowUp"]) pitch -= degToRad(1);
    if (currentPressedKey["ArrowDown"]) pitch += degToRad(1);
    if (currentPressedKey["="]) speed += 0.001;
    if (currentPressedKey["-"]) speed -= 0.001;
    if (speed > 0.008) speed = 0.008;
    if (speed < 0.0025) speed = 0.0025;
    
    // Pitch
    var norm = glMatrix.vec3.create();
    glMatrix.vec3.cross(norm, viewDir, up);
    glMatrix.quat.setAxisAngle(quatRot, norm, pitch);
    glMatrix.vec3.transformQuat(viewDir, viewDir, quatRot);
    glMatrix.vec3.transformQuat(up, up, quatRot)
    
    // Roll
    glMatrix.quat.setAxisAngle(quatRot, viewDir, roll);
    glMatrix.vec3.transformQuat(viewDir, viewDir, quatRot);
    glMatrix.vec3.transformQuat(up, up, quatRot);
    
    // Airplane Movement
    glMatrix.vec3.scale(directionVec, viewDir, speed);
    glMatrix.vec3.negate(directionVec, directionVec);
    glMatrix.vec3.add(transformVec, transformVec, directionVec);
}

//----------------------------------------------------------------------------------
/**
 * Function defining animation time
 */
 function time() {
    requestAnimationFrame(time);
     animate();
     draw();
 }

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  eventHandler();
  time();
  
}

//----------------------------------------------------------------------------------
/**
 * Handle DOM events.
 */
 function eventHandler() {
    // i.e. handles whether or not fog is on
    var fogOnDoc = document.getElementById("fogOn");
    var fogOff = document.getElementById("fogOff");
    fogOnDoc.onclick = () => { fogOn = true; };
    fogOff.onclick = () => { fogOn = false; };
     // handle keys
     document.onkeydown = handleKeyDown;
     document.onkeyup = handleKeyUp;
 }

//----------------------------------------------------------------------------------
/**
 * Handle event of key down.
 */
 function handleKeyDown(event) {
     if (event.key == "ArrowRight" || event.key == "ArrowLeft" || event.key == "ArrowDown" || event.key == "ArrowUp") {
         event.preventDefault();
     }
     currentPressedKey[event.key] = true;
 }

//----------------------------------------------------------------------------------
/**
 * Handle event of key up.
 */
 function handleKeyUp(event) {
     currentPressedKey[event.key] = false;
 }
