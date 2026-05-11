let video;
let poseNet;
let poses = [];
let handpose;
let hands = [];
let earringImgs = [];
let currentEarring = 1; // 預設顯示第 1 款

let facemesh;
let faces = [];
let maskImgs = [];
let currentMask = 1;
let totalMasks = 3; // 假設有 3 張臉譜圖片
let prevHandX = -1; // 記錄前一個影格的手部 X 座標
let swipeCooldown = 0; // 揮動判斷的冷卻時間

function preload() {
  // 預先載入 5 款耳環
  earringImgs[1] = loadImage('acc1_ring.png');
  earringImgs[2] = loadImage('acc2_pearl.png');
  earringImgs[3] = loadImage('acc3_tassel.png');
  earringImgs[4] = loadImage('acc4_jade.png');
  earringImgs[5] = loadImage('acc5_phoenix.png');

  // 預先載入臉譜圖片 (請確保這三張圖片存在於專案資料夾下)
  maskImgs[1] = loadImage('mask1_red.png');
  maskImgs[2] = loadImage('mask2_blue.png');
  maskImgs[3] = loadImage('mask3_gold.png');
  maskImgs[4] = loadImage('mask4_white.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // 嘗試鎖定螢幕為橫向 (針對手機/平板裝置，部分瀏覽器支援)
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => console.log('目前的環境不支援強制鎖定橫向'));
  }

  // 啟動攝影機，並明確要求提供橫向的高畫質畫面
  video = createCapture({
    audio: false,
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
  });
  video.hide(); // 隱藏預設的 HTML 影像元素，只保留畫布上的畫面

  // 載入 ml5.js 的 PoseNet 模型
  poseNet = ml5.poseNet(video, modelReady);
  poseNet.on('pose', function(results) {
    poses = results;
  });

  // 載入 ml5.js 的 Handpose 模型
  handpose = ml5.handpose(video, () => console.log('Handpose Model Loaded!'));
  handpose.on('predict', function(results) {
    hands = results;
  });

  // 載入 ml5.js 的 Facemesh 模型
  facemesh = ml5.facemesh(video, () => console.log('Facemesh Model Loaded!'));
  facemesh.on('predict', function(results) {
    faces = results;
  });
}

function modelReady() {
  console.log('PoseNet Model Loaded!');
}

function draw() {
  background('#ffc8dd');
  
  let vidW = windowWidth * 0.5;
  
  // 依照攝影機的原始比例計算高度，確保影像維持「橫向」而不被拉伸變形
  let vidRatio = video.width > 0 ? video.height / video.width : 9 / 16;
  let vidH = vidW * vidRatio;
  
  push();
  translate(windowWidth / 2, windowHeight / 2); // 將座標原點移至畫面正中心
  scale(-1, 1); // X 軸翻轉，達成左右顛倒（鏡像）效果
  imageMode(CENTER);
  image(video, 0, 0, vidW, vidH); // 繪製寬高為畫面 50% 的影像

  // 揮動判定冷卻倒數
  if (swipeCooldown > 0) {
    swipeCooldown--;
  }

  // 判斷手勢並決定要顯示哪一款耳環
  if (hands.length > 0) {
    let fingers = countFingers(hands[0]);
    if (fingers >= 1 && fingers <= 5) {
      currentEarring = fingers; // 更新目前應該顯示的耳環
    }

    // 手勢揮動判斷 (手從右向左揮)
    let currentHandX = hands[0].annotations.palmBase[0][0];
    if (prevHandX !== -1 && swipeCooldown === 0) {
      // 因為畫面使用 scale(-1, 1) 造成左右鏡像，在真實攝影機座標中，手從畫面右邊到左邊代表 X 數值「增加」
      if (currentHandX - prevHandX > 40) { 
        currentMask = (currentMask % totalMasks) + 1; // 循環切換臉譜
        swipeCooldown = 30; // 觸發後冷卻 30 個影格，避免連續觸發
      }
    }
    prevHandX = currentHandX;
  } else {
    prevHandX = -1; // 畫面中沒有手時重置
  }

  // 影像辨識：繪製左右耳垂位置
  if (poses.length > 0 && video.width > 0) {
    let pose = poses[0].pose;
    let leftEar = pose.leftEar;
    let rightEar = pose.rightEar;
    
    // 當信心指數足夠時才繪製（大於 0.2），避免未偵測到人臉時亂畫
    if (leftEar.confidence > 0.2) {
      let lx = map(leftEar.x, 0, video.width, -vidW / 2, vidW / 2);
      let ly = map(leftEar.y, 0, video.height, -vidH / 2, vidH / 2);
      image(earringImgs[currentEarring], lx, ly, 40, 40); // 顯示對應的耳環圖片
    }
    
    if (rightEar.confidence > 0.2) {
      let rx = map(rightEar.x, 0, video.width, -vidW / 2, vidW / 2);
      let ry = map(rightEar.y, 0, video.height, -vidH / 2, vidH / 2);
      image(earringImgs[currentEarring], rx, ry, 40, 40); // 顯示對應的耳環圖片
    }
  }

  // 影像辨識：繪製臉譜
  if (faces.length > 0 && video.width > 0) {
    let face = faces[0];
    
    // 利用 Facemesh 的 468 個特徵點，找出整個臉部的邊界範圍
    let minX = video.width, maxX = 0;
    let minY = video.height, maxY = 0;
    for (let i = 0; i < face.scaledMesh.length; i++) {
      let pt = face.scaledMesh[i];
      if (pt[0] < minX) minX = pt[0];
      if (pt[0] > maxX) maxX = pt[0];
      if (pt[1] < minY) minY = pt[1];
      if (pt[1] > maxY) maxY = pt[1];
    }
    
    // 計算臉部的中心點與真實寬高
    let cx = (minX + maxX) / 2;
    let cy = (minY + maxY) / 2;
    let faceW = maxX - minX;
    let faceH = maxY - minY;
    
    let mappedCX = map(cx, 0, video.width, -vidW / 2, vidW / 2);
    let mappedCY = map(cy, 0, video.height, -vidH / 2, vidH / 2);
    let mappedW = faceW * (vidW / video.width) * 1.5; // 放大 1.5 倍以確保覆蓋全臉
    let mappedH = faceH * (vidH / video.height) * 1.5;
    
    image(maskImgs[currentMask], mappedCX, mappedCY, mappedW, mappedH); // 顯示對應的臉譜圖片
  }

  pop();
}

// 計算伸直的手指數量
function countFingers(hand) {
  let fingers = 0;
  let ann = hand.annotations;
  
  // 判斷食指、中指、無名指、小指是否伸直（簡單判斷：指尖的 Y 座標是否小於指根的 Y 座標）
  if (ann.indexFinger[3][1] < ann.indexFinger[0][1]) fingers++;
  if (ann.middleFinger[3][1] < ann.middleFinger[0][1]) fingers++;
  if (ann.ringFinger[3][1] < ann.ringFinger[0][1]) fingers++;
  if (ann.pinky[3][1] < ann.pinky[0][1]) fingers++;
  
  // 判斷大拇指：因為大拇指運動方向較為特別，改用指尖到手掌底部的距離來做簡易判斷
  let palmBase = ann.palmBase[0];
  let thumbTipDist = dist(ann.thumb[3][0], ann.thumb[3][1], palmBase[0], palmBase[1]);
  let indexBaseDist = dist(ann.indexFinger[0][0], ann.indexFinger[0][1], palmBase[0], palmBase[1]);
  
  if (thumbTipDist > indexBaseDist * 1.2) fingers++;
  
  return fingers;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
