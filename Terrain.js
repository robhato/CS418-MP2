/**
 * @fileoverview Terrain - A simple 3D terrain using WebGL
 * @author Eric Shaffer
 */

/** Class implementing 3D terrain. */
class Terrain{   
/**
 * Initialize members of a Terrain object
 * @param {number} div Number of triangles along x axis and y axis
 * @param {number} minX Minimum X coordinate value
 * @param {number} maxX Maximum X coordinate value
 * @param {number} minY Minimum Y coordinate value
 * @param {number} maxY Maximum Y coordinate value
 */
    constructor(div,minX,maxX,minY,maxY){
        this.div = div;
        this.minX=minX;
        this.minY=minY;
        this.maxX=maxX;
        this.maxY=maxY;
        
        // Allocate vertex array
        this.vBuffer = [];
        // Allocate triangle array
        this.fBuffer = [];
        // Allocate normal array
        this.nBuffer = [];
        // Allocate array for edges so we can draw wireframe
        this.eBuffer = [];
        console.log("Terrain: Allocated buffers");
        
        this.generateTriangles();
        console.log("Terrain: Generated triangles");
        
        this.generateLines();
        console.log("Terrain: Generated lines");
        
        // Get extension for 4 byte integer indices for drwElements
        var ext = gl.getExtension('OES_element_index_uint');
        if (ext ==null){
            alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.");
        }
    }
    
    /**
    * Set the x,y,z coords of a vertex at location(i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    setVertex(v,i,j)
    {
        //Using the 2D array i,j coordinates, add values to vector v
        var oneDArrVal = 3*(i*(this.div+1) + j);
        this.vBuffer[oneDArrVal] = v[0];
        this.vBuffer[oneDArrVal + 1] = v[1];
        this.vBuffer[oneDArrVal + 2] = v[2];
       
    }
    
    /**
    * Return the x,y,z coordinates of a vertex at location (i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    getVertex(v,i,j)
    {
        //Using the 2D array i,j coordinates, add values to vector v
        var oneDArrVal = 3*(i*(this.div+1) + j);
        v[0] = this.vBuffer[oneDArrVal];
        v[1] = this.vBuffer[oneDArrVal + 1];
        v[2] = this.vBuffer[oneDArrVal + 2];
    }
    
    /**
    * Send the buffer objects to WebGL for rendering 
    */
    loadBuffers()
    {
        // Specify the vertex coordinates
        this.VertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);      
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vBuffer), gl.STATIC_DRAW);
        this.VertexPositionBuffer.itemSize = 3;
        this.VertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexPositionBuffer.numItems, " vertices");
    
        // Specify normals to be able to do lighting calculations
        this.VertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.nBuffer),
                  gl.STATIC_DRAW);
        this.VertexNormalBuffer.itemSize = 3;
        this.VertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexNormalBuffer.numItems, " normals");
    
        // Specify faces of the terrain 
        this.IndexTriBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.fBuffer),
                  gl.STATIC_DRAW);
        this.IndexTriBuffer.itemSize = 1;
        this.IndexTriBuffer.numItems = this.fBuffer.length;
        console.log("Loaded ", this.IndexTriBuffer.numItems, " triangles");
    
        //Setup Edges  
        this.IndexEdgeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.eBuffer),
                  gl.STATIC_DRAW);
        this.IndexEdgeBuffer.itemSize = 1;
        this.IndexEdgeBuffer.numItems = this.eBuffer.length;
        
        console.log("triangulatedPlane: loadBuffers");
    }
    
    /**
    * Render the triangles 
    */
    drawTriangles(){
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.drawElements(gl.TRIANGLES, this.IndexTriBuffer.numItems, gl.UNSIGNED_INT,0);
    }
    
    /**
    * Render the triangle edges wireframe style 
    */
    drawEdges(){
    
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.drawElements(gl.LINES, this.IndexEdgeBuffer.numItems, gl.UNSIGNED_INT,0);   
    }
/**
 * Fill the vertex and  triangle arrays 
 */    
generateTriangles()
{
    //Calculate distance between verticies on x and y respectively
    var dX = (this.maxX-this.minX)/this.div;
    var dY = (this.maxY-this.minY)/this.div;
    
    // iterate through values and push them to vertex and normal buffers
    for (var i = 0; i <= this.div; i++) {
        for (var j = 0; j <= this.div; j++) {
            //start at bottom and continue to iterate
            this.vBuffer.push(this.minX+dX*j);
            this.vBuffer.push(this.minY+dY*i);
            this.vBuffer.push(0);
            //since the first plane generated is flat, all normal vectors will be <0,0,1> i.e. straight up
            this.nBuffer.push(0);
            this.nBuffer.push(0);
            this.nBuffer.push(0);
        }
    }
    
    this.numVertices = this.vBuffer.length/3;
    this.faultLineCheck();
    this.findZ();
    
    // second nested for loop instance to generate face buffer values to specify connectivity of triangles
    for (var i = 0; i < this.div; i++) {
        for (var j = 0; j < this.div; j++) {
            var oneDArrVal = i*(this.div+1) + j;
            //triangle verticies will be at bottom left, one to the right, and one to the top
            this.fBuffer.push(oneDArrVal);
            this.fBuffer.push(oneDArrVal + 1);
            this.fBuffer.push(oneDArrVal + this.div + 1);
            //reverse of previous triangles so that each square in generated plane is divided into two triangles
            this.fBuffer.push(oneDArrVal + 1);
            this.fBuffer.push(oneDArrVal + 1 + this.div + 1);
            this.fBuffer.push(oneDArrVal + this.div + 1);
        }
    }
    
    
    this.numFaces = this.fBuffer.length/3;
    this.updateNormals();
}
    

    
/**
 * Update verticies in plane to enable changes in height
 */
faultLineCheck() {
    // number of iterations of partitioning
    var iter = 400;
    // number by which to increase or decrease the height by
    var delta = 0.004;
   
    
    for (var i = 0; i < iter; i++) {
        var randPoint = [this.minX + ((this.maxX - this.minX) * Math.random()),this.minY + ((this.maxY - this.minY) * Math.random())];
        var randNormal = glMatrix.vec2.create();
        glMatrix.vec2.random(randNormal);
        
        for (var x = 0; x < this.numVertices; x++) {
            var b = [this.vBuffer[x*3], this.vBuffer[x*3+1]];
            if ((b[0] - randPoint[0]) * randNormal[0] + (b[1] - randPoint[1]) * randNormal[1] > 0) {
                this.vBuffer[x * 3 + 2] += delta;
            } else {
                this.vBuffer[x * 3 + 2] -= delta;
            }
        }
        
    }
}
    
/**
 * Sets the location of the min and max Z coordinate in the system
 */
findZ() {
    this.minZ = Infinity;
    this.maxZ = -Infinity;
    for (var x = 0; x < this.numVertices; x++) {
        if (this.vBuffer[x*3+2] < this.minZ) {
            this.minZ = this.vBuffer[x*3+2];
        }
        if (this.vBuffer[x*3+2] > this.maxZ) {
            this.maxZ = this.vBuffer[x*3+2];
        }
    }
}
    
/**
 * Update normals for after fault line check is done for use in shading model
 */
updateNormals() {
    for (var i = 0; i < this.numFaces; i++) {
        var face1 = this.fBuffer[i * 3];
        var face2 = this.fBuffer[i * 3 + 1];
        var face3 = this.fBuffer[i * 3 + 2];
        
        //stores vectors coordinates
        var vecA = [this.vBuffer[face1 * 3], this.vBuffer[face1 * 3 + 1], this.vBuffer[face1 * 3 + 2]];
        var vecB = [this.vBuffer[face2 * 3], this.vBuffer[face2 * 3 + 1], this.vBuffer[face2 * 3 + 2]];
        var vecC = [this.vBuffer[face3 * 3], this.vBuffer[face3 * 3 + 1], this.vBuffer[face3 * 3 + 2]];
        //stores normal coordinates to add
        var normA = [this.nBuffer[face1 * 3], this.nBuffer[face1 * 3 + 1], this.nBuffer[face1 * 3 + 2]];
        var normB = [this.nBuffer[face2 * 3], this.nBuffer[face2 * 3 + 1], this.nBuffer[face2 * 3 + 2]];
        var normC = [this.nBuffer[face3 * 3], this.nBuffer[face3 * 3 + 1], this.nBuffer[face3 * 3 + 2]];
        
        //create new vectors from vector coordinates
        var dir1 = glMatrix.vec3.create();
        var dir2 = glMatrix.vec3.create();
        var norm = glMatrix.vec3.create();
        glMatrix.vec3.sub(dir1, vecB, vecA);
        glMatrix.vec3.sub(dir2, vecC, vecA);
        //create normal vector by taking cross product of face vectors
        glMatrix.vec3.cross(norm, dir1,dir2);
        
        //Add normal to normal coordinates
        glMatrix.vec3.add(normA, normA, norm);
        glMatrix.vec3.add(normB, normB, norm);
        glMatrix.vec3.add(normC, normC, norm);
        
        // And update the values in the normal buffer to the newly described normal vectors
        [this.nBuffer[face1 * 3], this.nBuffer[face1 * 3 + 1], this.nBuffer[face1 * 3 + 2]] = normA;
        [this.nBuffer[face2 * 3], this.nBuffer[face2 * 3 + 1], this.nBuffer[face2 * 3 + 2]] = normB;
        [this.nBuffer[face3 * 3], this.nBuffer[face3 * 3 + 1], this.nBuffer[face3 * 3 + 2]] = normC;
    }
        
        //Finally, we normalize the vector to make it unit length
        for (var x = 0; x < this.numVertices; x++) {
            var norm = [this.nBuffer[x*3], this.nBuffer[x*3+1], this.nBuffer[x*3+2]];
            glMatrix.vec3.normalize(norm, norm);
            [this.nBuffer[x*3], this.nBuffer[x*3+1], this.nBuffer[x*3+2]] = norm;
        }
}
    
/**
 * Print vertices and triangles to console for debugging
 */
printBuffers()
    {
        
    for(var i=0;i<this.numVertices;i++)
          {
           console.log("v ", this.vBuffer[i*3], " ", 
                             this.vBuffer[i*3 + 1], " ",
                             this.vBuffer[i*3 + 2], " ");
                       
          }
    
      for(var i=0;i<this.numFaces;i++)
          {
           console.log("f ", this.fBuffer[i*3], " ", 
                             this.fBuffer[i*3 + 1], " ",
                             this.fBuffer[i*3 + 2], " ");
                       
          }
        
    }

/**
 * Generates line values from faces in faceArray
 * to enable wireframe rendering
 */
generateLines()
{
    var numTris=this.fBuffer.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        this.eBuffer.push(this.fBuffer[fid]);
        this.eBuffer.push(this.fBuffer[fid+1]);
        
        this.eBuffer.push(this.fBuffer[fid+1]);
        this.eBuffer.push(this.fBuffer[fid+2]);
        
        this.eBuffer.push(this.fBuffer[fid+2]);
        this.eBuffer.push(this.fBuffer[fid]);
    }
    
}
    
}
