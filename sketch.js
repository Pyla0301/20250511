let video;
let poseNet;
let poses = [];
let handpose;
let hands = [];
let earringImgs = [];
let currentEarring = 1; // 預設顯示第 1 款

function preload() {
  // 預先載入 5 款耳環
  earringImgs[1] = loadImage('acc1_ring.png');
  earringImgs[2] = loadImage('acc2_pearl.png');
  earringImgs[3] = loadImage('acc3_tassel.png');
  earringImgs[4] = loadImage('acc4_jade.png');
  earringImgs[5] = loadImage('acc5_phoenix.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
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
}

function modelReady() {
  console.log('PoseNet Model Loaded!');
}

function draw() {
  background('#ffc8dd');
  
  let vidW = windowWidth * 0.5;
  let vidH = windowHeight * 0.5;
  
  push();
  translate(windowWidth / 2, windowHeight / 2); // 將座標原點移至畫面正中心
  scale(-1, 1); // X 軸翻轉，達成左右顛倒（鏡像）效果
  imageMode(CENTER);
  image(video, 0, 0, vidW, vidH); // 繪製寬高為畫面 50% 的影像

  // 判斷手勢並決定要顯示哪一款耳環
  if (hands.length > 0) {
    let fingers = countFingers(hands[0]);
    if (fingers >= 1 && fingers <= 5) {
      currentEarring = fingers; // 更新目前應該顯示的耳環
    }
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
