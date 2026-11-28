const socket=io(),$=id=>document.getElementById(id);let me=null,isHost=false,room=null,hand=[],pendingWild=null;let playerKey=localStorage.getItem('unoPlayerKey');if(!playerKey){playerKey=crypto.randomUUID();localStorage.setItem('unoPlayerKey',playerKey)}const qs=new URLSearchParams(location.search),roomCode=qs.get('room'),hostId=qs.get('host'),labels={skip:'CẤM',reverse:'ĐẢO',draw2:'+2',wild:'WILD',draw4:'+4'},avatarFiles={long:'long.png',mai:'mai.png',huy:'huy.png',lan:'lan.png',nam:'nam.png',an:'an.png',minh:'minh.png'};
function cardImagePath(card){
 const color=card.color==='wild'?'wild':String(card.color||'').toLowerCase();
 const value=String(card.value||'').toLowerCase();
 const face=value==='draw4'?'draw4':value==='wild'?'wild':value==='draw2'?'draw2':value;
 return `/assets/cards/${color}-${face}.png`;
}
function putCardArt(element,card){
 const img=document.createElement('img');
 img.className='card-art';
 img.src=cardImagePath(card);
 img.alt=`${card.color} ${labels[card.value]||card.value}`;
 img.draggable=false;
 img.onerror=()=>{element.classList.remove('has-art');element.textContent=labels[card.value]||card.value};
 element.classList.add('has-art');
 element.replaceChildren(img);
}
const avatarByGender={female:[['long','Chibi nữ 1'],['lan','Chibi nữ 2'],['an','Chibi nữ 3'],['mai','Chibi nữ 4']],male:[['huy','Chibi nam 1'],['nam','Chibi nam 2']]};function refreshAvatarChoices(preferred){const gender=$('gender')?.value||'female',select=$('avatarChoice');if(!select)return;const choices=avatarByGender[gender]||avatarByGender.female;select.innerHTML=choices.map(([key,label])=>`<option value="${key}">${label}</option>`).join('');if(choices.some(x=>x[0]===preferred))select.value=preferred;}
function toast(s){const t=$('toast');t.textContent=s;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2600)}function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function validName(raw){const name=String(raw||'').normalize('NFC').replace(/\s+/gu,' ').trim();return /^[\p{L}\p{N} _.-]{2,22}$/u.test(name)?name:''}const saved=(()=>{try{return JSON.parse(sessionStorage.getItem('unoJoinPrefs')||'{}')}catch{return {}}})();if(saved.name&&$('name'))$('name').value=saved.name;if(roomCode&&$('code'))$('code').value=roomCode;if(saved.gender&&$('gender'))$('gender').value=saved.gender;refreshAvatarChoices(saved.avatarKey);$('gender').addEventListener('change',()=>refreshAvatarChoices());function join(){if(!roomCode)return toast('Hãy nhập mã phòng.');const name=hostId?'Chủ phòng':validName($('name').value);if(!name)return toast('Tên cần 2–22 ký tự, chỉ dùng chữ, số, dấu cách, _ . hoặc - nhé.');const gender=$('gender')?.value,avatarKey=$('avatarChoice')?.value;if(!['male','female'].includes(gender)||!['long','mai','huy','lan','nam','an'].includes(avatarKey))return toast('Anh/chị hãy chọn lại giới tính và chibi.');sessionStorage.setItem('unoJoinPrefs',JSON.stringify({name,gender,avatarKey}));socket.emit('room:join',{code:roomCode,name,gender,avatarKey,hostId:hostId||undefined,playerKey})}$('join').onclick=()=>{if(roomCode){join();return}const c=$('code').value.trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(c))return toast('Mã phòng phải gồm đúng 6 chữ cái hoặc số.');const n=validName($('name').value);if(!n)return toast('Tên cần 2–22 ký tự, không để trống.');sessionStorage.setItem('unoJoinPrefs',JSON.stringify({name:n,gender:$('gender').value,avatarKey:$('avatarChoice').value}));history.replaceState(null,'',`/?room=${encodeURIComponent(c)}`);location.reload()};socket.on('connect',()=>{
 if(roomCode){
  const savedPrefs=(()=>{try{return JSON.parse(sessionStorage.getItem('unoJoinPrefs')||'{}')}catch{return {}}})();
  if(savedPrefs.name && $('name').value.trim()) join();
 }
});socket.on('connect_error',()=>toast('Không kết nối được máy chủ. Hãy tải lại trang hoặc kiểm tra Railway.'));socket.on('disconnect',()=>{if(roomCode)toast('Mất kết nối máy chủ. Đang chờ kết nối lại…')});socket.on('room:joined',d=>{me=d.playerId;isHost=d.host;$('lobby').classList.add('hidden');$('game').classList.remove('hidden');$('roomLabel').textContent=d.code;$('myName').textContent=isHost?'CHỦ PHÒNG':($('name').value||'BẠN')});socket.on('game:error',message=>{
 toast(message);
 if(!me){$('lobby').classList.remove('hidden');$('game').classList.add('hidden');}
});socket.on('hand:state',h=>{const old=hand.length;hand=Array.isArray(h)?h:[];renderHand();if(hand.length>old)playFx('draw');});socket.on('room:state',s=>{room=s;renderRoom()});
socket.on('game:started',()=>toast('Đã chia bài! Chúc mọi người chơi vui vẻ.'));
$('startGame').onclick=()=>{if(!isHost)return toast('Chỉ chủ phòng mới được bắt đầu.');if(!room||room.players.length<2)return toast('Cần ít nhất 2 người chơi để chia bài.');socket.emit('game:start')};
let previousTop=null,previousTurn=null;function renderRoom(){if(!room)return;renderBoardLists();const startButton=$('startGame');if(startButton){const canStart=isHost&&['lobby','finished'].includes(room.status);startButton.classList.toggle('hidden',!canStart);startButton.disabled=room.players.length<2;startButton.textContent=room.status==='finished'?'🎴 CHIA BÀI VÁN MỚI':'🎴 BẮT ĐẦU CHIA BÀI';}if(room.top&&previousTop&&room.top.id!==previousTop)playCardFx(room.top,room.activeColor);if(previousTurn&&room.currentPlayerId!==previousTurn)playFx('turn');previousTop=room.top?.id||null;previousTurn=room.currentPlayerId;$('online').textContent=room.players.filter(p=>p.connected).length+'/6';$('seats').innerHTML='';const pos=['p1','p2','p3','p4','p5','p6'],avatarOrder=['long.png','mai.png','huy.png','lan.png','nam.png','an.png'];room.players.forEach((p,i)=>{const e=document.createElement('div');e.className='seat '+pos[i]+(p.id===room.currentPlayerId?' active':'');e.dataset.pid=p.id;e.innerHTML=`<div class="avatar-wrap"><img class="avatar-img" src="/assets/${avatarFiles[p.avatarKey]||avatarOrder[i]||'minh.png'}" alt="${esc(p.name)}"><div class="wins">🏆<b>${p.wins||0}</b></div><div class="bubble hidden"></div></div><div class="seat-name">${esc(p.name)} ${p.host?'👑':''}</div><div class="seat-count">🃏 ${p.count} lá</div><button type="button" class="poke-btn" data-poke="${p.id}" ${p.id===me?'disabled title="Không thể tự chọc mình"':''}>👉 CHỌC</button>`;$('seats').append(e)});const cur=room.players.find(p=>p.id===room.currentPlayerId);$('turnName').textContent=cur?.name||'—';const mine=room.players.find(p=>p.id===me);if(mine)$('myName').textContent=mine.name;$('notice').textContent=room.notice||'';if(room.top){const shownColor=room.top.color==='wild'?(room.activeColor||'wild'):room.top.color;$('discardPile').className='playing-card '+shownColor+' value-'+String(room.top.value).replace(/[^a-z0-9]/gi,'');if(room.top.color==='wild')$('discardPile').dataset.chosenColor=room.activeColor||'';else delete $('discardPile').dataset.chosenColor; putCardArt($('discardPile'),room.top);if(room.top.color==='wild'&&room.activeColor){const chosen=document.createElement('span');chosen.className='wild-chosen-color '+shownColor;chosen.textContent=({red:'ĐỎ',yellow:'VÀNG',green:'XANH LÁ',blue:'XANH DƯƠNG'})[shownColor]||shownColor.toUpperCase();chosen.setAttribute('aria-label',`Màu đã chọn: ${chosen.textContent}`);$('discardPile').append(chosen)}$('discardPile').title=room.top.color==='wild'?`Wild đã chọn màu ${shownColor}`:''}else $('discardPile').textContent='UNO';renderMessages(room.chat||[])}
function renderHand(){
 $('hand').innerHTML='';
 hand.forEach((c,i)=>{
  const b=document.createElement('button');
  b.className='playing-card hand-card '+c.color+' value-'+String(c.value).replace(/[^a-z0-9]/gi,'');
  b.style.setProperty('--i',i);
  b.type='button';
  b.setAttribute('aria-label',`${c.color} ${labels[c.value]||c.value}`);
  putCardArt(b,c);
  b.onclick=()=>play(c);
  $('hand').append(b);
 });
 $('myCount').textContent=hand.length+' lá';
}
function play(c){if(!room||room.status!=='playing')return toast('Ván chưa bắt đầu.');if(room.currentPlayerId!==me)return toast('Chưa đến lượt bạn.');if(c.color==='wild'){pendingWild=c;$('colorModal').classList.remove('hidden');return}socket.emit('card:play',{cardId:c.id})}
document.querySelectorAll('.pick').forEach(b=>b.onclick=()=>{if(!pendingWild)return;socket.emit('card:play',{cardId:pendingWild.id,color:b.dataset.color});pendingWild=null;$('colorModal').classList.add('hidden')});$('cancelColor').onclick=()=>{$('colorModal').classList.add('hidden');pendingWild=null};$('draw').onclick=()=>$('drawPile').click();$('drawPile').onclick=()=>socket.emit('card:draw');$('pass').onclick=()=>socket.emit('turn:pass');$('uno').onclick=()=>socket.emit('uno:call');$('catch').onclick=()=>{if(!room)return;const target=room.players.find(p=>p.id!==me&&p.count===1&&!p.saidUno);if(!target)return toast('Không có người chơi nào để bắt UNO.');socket.emit('uno:catch',{targetId:target.id})};$('reactions').querySelectorAll('button').forEach(b=>b.onclick=()=>socket.emit('reaction:send',{emoji:b.textContent}));
function burstEmoji(emoji){const layer=$('reactionOverlay');if(!layer)return;const node=document.createElement('span');node.className='screen-emoji';node.textContent=emoji;node.style.left=(5+Math.random()*90)+'vw';node.style.setProperty('--drift',((Math.random()-.5)*120)+'px');node.style.setProperty('--spin',((Math.random()-.5)*55)+'deg');layer.append(node);setTimeout(()=>node.remove(),1900)}
socket.on('reaction:show',d=>{const s=[...$('seats').children].find(x=>x.dataset.pid===d.playerId);if(!s)return;const b=s.querySelector('.bubble');b.textContent=d.emoji;b.classList.add('bubble-emoji');b.classList.remove('hidden');playFx('reaction');clearTimeout(b.timer);b.timer=setTimeout(()=>{b.classList.add('hidden');b.classList.remove('bubble-emoji')},2600)});
$('seats').addEventListener('click',e=>{const btn=e.target.closest('[data-poke]');if(!btn||btn.disabled)return;socket.emit('player:poke',{targetId:btn.dataset.poke})});
socket.on('player:poked',d=>{playFx('poke');const s=[...$('seats').children].find(x=>x.dataset.pid===d.targetId);if(!s)return;const b=s.querySelector('.bubble');b.textContent='👉 '+d.emoji;b.classList.remove('hidden');clearTimeout(b.timer);b.timer=setTimeout(()=>b.classList.add('hidden'),2600);s.classList.remove('is-poked');void s.offsetWidth;s.classList.add('is-poked');setTimeout(()=>s.classList.remove('is-poked'),650);if(d.targetId===me)toast(`${d.fromName} vừa chọc bạn!`)});
$('chatFab').onclick=()=>{$('chatPanel').classList.remove('hidden');$('chatInput').focus()};$('chatClose').onclick=()=>$('chatPanel').classList.add('hidden');$('chatForm').onsubmit=e=>{e.preventDefault();const message=$('chatInput').value.trim();if(message)socket.emit('chat:send',{message});$('chatInput').value=''};socket.on('chat:message',d=>{const s=[...$('seats').children].find(x=>x.dataset.pid===d.playerId);if(s){const b=s.querySelector('.bubble');b.textContent=d.message;const emojiOnly=/^(?:\p{Extended_Pictographic}|\uFE0F|\u200D|\s)+$/u.test(d.message.trim());b.classList.toggle('bubble-emoji',emojiOnly);b.classList.remove('hidden');clearTimeout(b.timer);b.timer=setTimeout(()=>{b.classList.add('hidden');b.classList.remove('bubble-emoji')},4500)}playFx('message');addMessage(d)});function renderMessages(a){$('messages').innerHTML='';a.forEach(addMessage)}function addMessage(d){const e=document.createElement('div');e.className='message';const b=document.createElement('b');b.textContent=d.name+': ';e.append(b,document.createTextNode(d.message));$('messages').append(e);$('messages').scrollTop=$('messages').scrollHeight}

// Pháo hoa mừng chiến thắng: canvas nhẹ, tự dọn sau vài giây.
function launchFireworks(){
 const canvas=document.createElement('canvas');canvas.className='fireworks-canvas';canvas.setAttribute('aria-hidden','true');
 const ctx=canvas.getContext('2d');if(!ctx)return;
 Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',zIndex:'31',pointerEvents:'none'});
 document.body.append(canvas);
 const dpr=Math.min(window.devicePixelRatio||1,2);let w=0,h=0,raf=0,frames=0;const particles=[];
 const resize=()=>{w=window.innerWidth;h=window.innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)};
 resize();
 function burst(x,y){
  const hue=Math.floor(Math.random()*360),count=64;
  for(let i=0;i<count;i++){const a=Math.PI*2*i/count+(Math.random()-.5)*.08,s=1.4+Math.random()*4.2;
   particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:55+Math.random()*30,max:85,hue:hue+Math.random()*35,size:1.5+Math.random()*2.3})}
 }
 const launchAt=[12,42,72,105,138];let next=0;
 function frame(){
  frames++;ctx.clearRect(0,0,w,h);
  if(next<launchAt.length&&frames>=launchAt[next]){burst(w*(.18+Math.random()*.64),h*(.16+Math.random()*.42));next++}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.035;p.vx*=.992;p.vy*=.992;p.life--;
   ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=`hsl(${p.hue},100%,65%)`;ctx.shadowBlur=12;ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
   if(p.life<=0)particles.splice(i,1);
  }
  ctx.globalAlpha=1;ctx.shadowBlur=0;
  if(frames<230||particles.length){raf=requestAnimationFrame(frame)}else{cancelAnimationFrame(raf);canvas.remove()}
 }
 const onResize=()=>resize();window.addEventListener('resize',onResize,{passive:true});
 const cleanup=()=>{window.removeEventListener('resize',onResize);canvas.remove()};
 setTimeout(cleanup,6500);frame();
}
socket.on('game:finished',d=>{playFx(d.winnerId===me?'win':'lose');launchFireworks();$('winnerText').textContent=d.winner+' CHIẾN THẮNG!';$('resultModal').classList.remove('hidden')});$('newGame').onclick=()=>{if(!isHost)return toast('Chỉ chủ phòng mới được mở ván mới.');socket.emit('game:start');$('resultModal').classList.add('hidden')};$('closeResult').onclick=()=>$('resultModal').classList.add('hidden');
// Âm thanh gốc tạo bằng Web Audio API: không cần tải MP3 bên ngoài.
let audioCtx=null,musicOn=false,fxOn=true,musicTimer=null,musicStep=0;
function audio(){if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}
function tone(freq,duration=.12,wave='sine',volume=.12,delay=0){if(!fxOn)return;const c=audio(),o=c.createOscillator(),g=c.createGain();o.type=wave;o.frequency.value=freq;g.gain.setValueAtTime(.0001,c.currentTime+delay);g.gain.exponentialRampToValueAtTime(volume,c.currentTime+delay+.015);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+delay+duration);o.connect(g);g.connect(c.destination);o.start(c.currentTime+delay);o.stop(c.currentTime+delay+duration+.03)}
function playFx(type){if(!fxOn)return;const seq={play:[[520,.09],[760,.1]],draw:[[330,.08],[440,.1]],turn:[[880,.15]],reaction:[[880,.07],[1175,.09],[1568,.13]],message:[[740,.07],[988,.1]],poke:[[660,.08],[990,.12],[780,.1]],win:[[523,.16],[659,.16],[784,.2],[1046,.38]],lose:[[392,.2],[330,.25],[262,.4]]};(seq[type]||[]).forEach((n,i)=>tone(n[0],n[1],'triangle',type==='win'?.16:.09,i*.11));}
// Âm báo riêng theo màu và chức năng lá bài; mọi người trong phòng đều nghe khi lá mới được đánh.
function playCardFx(card,activeColor){if(!fxOn||!card)return;const color=card.color==='wild'?(activeColor||'wild'):String(card.color||'').toLowerCase();const colorSeq={red:[660,880],green:[523,659],yellow:[784,988],blue:[440,587],wild:[587,784,988]};(colorSeq[color]||colorSeq.wild).forEach((f,i)=>tone(f,.105,'sine',.105,i*.095));const value=String(card.value||'').toLowerCase();const special={skip:[[880,.09],[440,.22]],reverse:[[440,.1],[784,.1],[440,.16]],draw2:[[587,.09],[587,.09],[880,.18]],draw4:[[330,.12],[440,.12],[587,.12],[880,.24]],wild:[[523,.1],[659,.1],[784,.2]]};(special[value]||[]).forEach((n,i)=>tone(n[0],n[1],'triangle',.11,.24+i*.12));}
function setMusic(on){const track=$('bgMusic');musicOn=on;$('musicToggle').textContent=on?'🎵 Nhạc: Bật':'🎵 Nhạc: Tắt';if(on){track.volume=.45;const result=track.play();if(result&&result.catch)result.catch(()=>{musicOn=false;$('musicToggle').textContent='🎵 Nhạc: Tắt';toast('Hãy chạm nút Nhạc để phát nhạc nền.');});}else{track.pause();}}
$('musicToggle').onclick=()=>setMusic(!musicOn);$('fxToggle').onclick=()=>{fxOn=!fxOn;$('fxToggle').textContent=fxOn?'🔔 Âm thanh: Bật':'🔕 Âm thanh: Tắt';if(fxOn){audio();playFx('turn')}};

let leaderboardData=[];
function renderBoardLists(){
 const globalRows=leaderboardData.slice(0,10);
 $('leaderboard').innerHTML=globalRows.length?globalRows.map((p,i)=>`<div>${i+1}. ${esc(p.name)} <b>${p.wins} 🏆</b></div>`).join(''):'Chưa có dữ liệu xếp hạng lâu dài.';
 let rows=globalRows;
 if(!rows.length&&room?.players?.length) rows=room.players.map(p=>({name:p.name,wins:p.wins||0})).sort((a,b)=>b.wins-a.wins).slice(0,6);
 $('gameLeaderboardList').innerHTML=rows.length?rows.map((p,i)=>`<div class="rank-chip rank-${i+1}"><span class="rank-number">${i+1}</span><b class="rank-name">${esc(p.name)}</b><span class="rank-wins">${p.wins||0} 🏆</span></div>`).join(''):'<span class="rank-empty">Chưa có thành tích · Chơi để ghi danh!</span>';
}
async function loadBoard(){try{const r=await fetch('/api/leaderboard');if(!r.ok)throw Error('board');leaderboardData=await r.json();renderBoardLists()}catch{$('leaderboard').textContent='Chưa tải được bảng xếp hạng.';renderBoardLists()}}
loadBoard();setInterval(loadBoard,30000);
const rankToggle=$('rankToggle'),rankPanel=$('gameLeaderboardPanel'),rankClose=$('rankClose');
function setRankPanel(open){
 rankPanel.hidden=!open;
 rankToggle.setAttribute('aria-expanded',String(open));
 rankToggle.setAttribute('aria-label',open?'Đóng bảng xếp hạng':'Mở bảng xếp hạng');
}
rankToggle.addEventListener('click',()=>setRankPanel(rankPanel.hidden));
rankClose.addEventListener('click',()=>setRankPanel(false));
document.addEventListener('click',e=>{
 if(!rankPanel.hidden&&!rankPanel.contains(e.target)&&!rankToggle.contains(e.target))setRankPanel(false);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!rankPanel.hidden)setRankPanel(false)});

// Hoa mai rơi nhẹ để tạo không khí Tết mà không che thao tác.
(function addPetals(){const layer=document.createElement('div');layer.className='petal-layer';document.body.append(layer);for(let i=0;i<9;i++){const p=document.createElement('span');p.className='petal';p.textContent='✿';p.style.left=(Math.random()*100)+'%';p.style.animationDelay=(-Math.random()*18)+'s';p.style.animationDuration=(14+Math.random()*10)+'s';p.style.fontSize=(10+Math.random()*10)+'px';layer.append(p)}})();
