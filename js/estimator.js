var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(40, 1500 / 800, 0.1, 5000);
var currentGlass = 0;
var currentTrial = 0;
var lastGlass = 0;
var amt = 0;
var mouse = new THREE.Vector2();
var raycaster = new THREE.Raycaster();
var intersection = null;
var notInitialized = true;
var amtLocked = false;
var startTime = 0;
var db = firebase.firestore();

var userID = 0;
function parseURLParams(url) {
    var queryStart = url.indexOf("?") + 1,
        queryEnd   = url.indexOf("#") + 1 || url.length + 1,
        query = url.slice(queryStart, queryEnd - 1),
        pairs = query.replace(/\+/g, " ").split("&"),
        parms = {}, i, n, v, nv;

    if (query === url || query === "") return;

    for (i = 0; i < pairs.length; i++) {
        nv = pairs[i].split("=", 2);
        n = decodeURIComponent(nv[0]);
        v = decodeURIComponent(nv[1]);

        if (!parms.hasOwnProperty(n)) parms[n] = [];
        parms[n].push(nv.length === 2 ? v : null);
    }
    return parms;
}

var userID = parseURLParams(window.location.href)["userID"][0];
var lastAmt;

var renderer = new THREE.WebGLRenderer({antialias: true, physicallyCorrectLights: true});
renderer.setSize(1500, 800);
renderer.shadowMap.enabled = true;

document.body.appendChild(renderer.domElement);

var roomMat = new THREE.MeshStandardMaterial({color: 0x888570, side: THREE.BackSide, roughness: 1});
var groundMat = new THREE.MeshStandardMaterial({color: 0x696969, roughness: 1});
var fillMat = new THREE.MeshStandardMaterial({color: 0xaaffff, transparent: true, opacity: 0.7, roughness: 0, metalness: 0.5});
var glassMat = new THREE.MeshStandardMaterial({color: 0xffffff, transparent: true, opacity: 0.2, roughness: 0, metalness: 0.5});
var ground = new THREE.Mesh(new THREE.BoxGeometry(4000, 400, 2500), groundMat);
ground.position.y = -210;
ground.receiveShadow = true;

var room = new THREE.Mesh(new THREE.BoxGeometry(3000, 3000, 3000), roomMat);
var envLight = new THREE.AmbientLight(0xffffff, 1.7);
var pointLight = new THREE.PointLight(0xffffff, 1.3, 0, 2);
pointLight.castShadow = true;
pointLight.position.set(400, 1500, 700);
pointLight.shadow.mapSize.width = 512;
pointLight.shadow.mapSize.height = 512;
pointLight.shadow.camera.near = 0.1
pointLight.shadow.camera.far = 3000

scene.add(envLight, pointLight, ground, room);

var glassesFile = [[0, 100, 300, 300],
                   [1, 175, 300, 300],
                   [2, 250, 300, 300],
                   [3, 100, 433.9746, 300],
                   [4, 175, 433.9746, 300],
                   [5, 250, 433.9746, 300],
                   [6, 100, 588.6751, 300],
                   [7, 175, 588.6751, 300],
                   [8, 250, 588.6751, 300],
                   [9, 100, 500, 500],
                   [10, 175, 500, 500],
                   [11, 250, 500, 500],
                   [12, 100, 633.9746, 500],
                   [13, 175, 633.9746, 500],
                   [14, 250, 633.9746, 500],
                   [15, 100, 788.6751, 500],
                   [16, 175, 788.6751, 500],
                   [17, 250, 788.6751, 500],
                   [18, 100, 400, 400],
                   [19, 175, 400, 400],
                   [20, 250, 400, 400]];

var trialWorking = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

var trialOrder = [];
var glasses = [];
var fills = [];
var userGlasses = [];
var userFills = [];
var glassMeshes = [];
var fillMeshes = [];
var userGlassMeshes = [];
var userFillMeshes = [];
var vol = [];
var results = [];

camera.position.z = 3000;
camera.position.y = 250;

for (i = 0; i < glassesFile.length * 3; i++) {
    var j = i % 21;
    if (j == 0) {
        console.log("Reached end of trials, resetting");
        trialWorking = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    }

    k = Math.floor(Math.random() * trialWorking.length);

    trialOrder[i] = trialWorking[k]
    trialWorking.splice(k,1);
}
currentGlass = trialOrder[currentTrial];

for (i = 0; i < glassesFile.length; i++) {
    var fillLevel = glassesFile[i][1];
    var glassHeight = 520; // add 20 to whatever height you want for non-user glassHeight

    var userFillTopRad = glassesFile[i][3]+(glassesFile[i][2]-glassesFile[i][3])*(amt/500);
    var userFillBotRad = glassesFile[i][3];
    var userFillHeight = amt;

    var userGlassTopRad = glassesFile[i][2]+10;
    var userGlassBotRad = glassesFile[i][3]+10;
    var userGlassHeight = 520;

    fills.push(new THREE.CylinderBufferGeometry(400, 400, fillLevel, 48));
    glasses.push(new THREE.CylinderBufferGeometry(410, 410, glassHeight, 48));

    userFills.push(new THREE.CylinderBufferGeometry(userFillTopRad, userFillBotRad, userFillHeight, 48));
    userGlasses.push(new THREE.CylinderBufferGeometry(userGlassTopRad, userGlassBotRad, userGlassHeight, 48));

    fillMeshes.push(new THREE.Mesh(fills[i], fillMat));
    glassMeshes.push(new THREE.Mesh(glasses[i], glassMat));

    userFillMeshes.push(new THREE.Mesh(userFills[i], fillMat));
    userGlassMeshes.push(new THREE.Mesh(userGlasses[i], glassMat));

    fillMeshes[i].position.add(new THREE.Vector3(-(400+userGlassTopRad)*0.65, fillLevel/2+10, 0));
    fillMeshes[i].castShadow = true;

    glassMeshes[i].position.add(new THREE.Vector3(-(400+userGlassTopRad)*0.65, glassHeight/2, 0));

    userFillMeshes[i].position.add(new THREE.Vector3((400+userGlassTopRad)*0.65, userFillHeight/2, 0));
    userFillMeshes[i].castShadow = true;

    userGlassMeshes[i].position.add(new THREE.Vector3((400+userGlassTopRad)*0.65, userGlassHeight/2, 0));

    vol[i] = fillLevel*Math.PI*160000;

    setTimeout(function(){animate();},1);
    startTime = Date.now();
}

function animate() {
    setTimeout( function() {
        requestAnimationFrame( animate );
    }, 1000 / 5 );

    if (lastGlass !== currentGlass || notInitialized) {
        scene.remove(glassMeshes[lastGlass], fillMeshes[lastGlass], userGlassMeshes[lastGlass], userFillMeshes[lastGlass]);     
        scene.add(fillMeshes[currentGlass], glassMeshes[currentGlass], userFillMeshes[currentGlass], userGlassMeshes[currentGlass]);
        if (notInitialized) {notInitialized = false;}
    }

    lastGlass = currentGlass;

    renderer.render(scene, camera);
}

function updateGlassFill(amt) {
    scene.remove(userFillMeshes[currentGlass]);
    userFillMeshes[currentGlass].geometry.dispose();
    delete(userFillMeshes[currentGlass]);

    userFills[currentGlass] = new THREE.CylinderBufferGeometry(glassesFile[currentGlass][3]+(glassesFile[currentGlass][2]-glassesFile[currentGlass][3])*amt/500, glassesFile[currentGlass][3], amt, 48);
    userFillMeshes[currentGlass] = new THREE.Mesh(userFills[currentGlass], fillMat);
    userFillMeshes[currentGlass].position.add(new THREE.Vector3((410+glassesFile[currentGlass][2])*0.65, amt/2+10, 0));
    userFillMeshes[currentGlass].renderOrder = -3;
    userFillMeshes[currentGlass].castShadow = true;

    scene.add(userFillMeshes[currentGlass]);
}

function onDocumentMouseMove(event) {
    if (amtLocked) {return;}

    raycaster.setFromCamera(mouse, camera);
    event.preventDefault();
    mouse.x = (event.clientX / 1500) * 2 - 1;
    mouse.y = -(event.clientY / 800) * 2 + 1;

    var intersects = raycaster.intersectObject(userGlassMeshes[currentGlass]);
    intersection = ( intersects.length ) > 0 ? intersects[ 0 ] : null;
    if (intersection !== null) {
        amt = intersection.point.y;
        if (amt < 0) {amt = 0;}
        if (amt > 500) {amt = 500;}
    }

    if (amt !== lastAmt) {
        updateGlassFill(amt);
    }

    lastAmt = amt;
}

function onDocumentMouseDown(event) {
    if (intersection !== null) {
        amtLocked = !amtLocked;
        if (amtLocked) {
            document.getElementById("InactiveControls").addEventListener('mousedown', onSubmit, false);
            document.getElementById("InactiveControls").id = "Controls";
        } else {
            document.getElementById("Controls").removeEventListener('mousedown', onSubmit, false);
            document.getElementById("Controls").id = "InactiveControls";
        }
    }
}

function onSubmit(event) {
    updateGlassFill(0);

    var fillHeight = userFills[currentGlass].parameters.height;
    var fillTopRad = userFills[currentGlass].parameters.radiusTop;
    var fillBotRad = userFills[currentGlass].parameters.radiusBottom;
    var endTime = Date.now();
    var timeTaken = endTime - startTime;


    var userVol = fillHeight*Math.PI*(Math.pow(fillTopRad,2)+fillTopRad*fillBotRad+Math.pow(fillBotRad,2))/3;
    db.collection(userID).add({
        glass: currentGlass+1,
        exampleFill: glassesFile[currentGlass][1],
        userTopRad: glassesFile[currentGlass][2],
        userBotRad: glassesFile[currentGlass][3],
        exampleVol: vol[currentGlass],
        userVol: userVol,
        percentError: userVol/vol[currentGlass]-1,
        timeTaken: timeTaken,
        startTime: startTime,
        endTime: endTime,
        dissertation: 1
    })
        .then(function(docRef) {
            console.log("Document written with ID: ", docRef.id);
        })
        .catch(function(error) {
            console.error("Error adding document: ", error);
        });

    startTime = endTime;
    currentTrial++;
    currentGlass = trialOrder[currentTrial];
    if (currentTrial >= 63) {
        alert("You will now be redirected to the end survey.");
        window.location.replace("https://ncsu.qualtrics.com/jfe/form/SV_803MDy8ppLZdFfD?userID=" + userID);
    }
}

document.addEventListener('mousemove', onDocumentMouseMove, false);
document.addEventListener('mousedown', onDocumentMouseDown, false);
