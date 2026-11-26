const socket=io(),$=id=>document.getElementById(id);let code,hostId,url;
function toast(m){let t=$("toast");t.textContent=m;t.style.display="block";setTimeout(()=>t.style.display="none",2500)}
$("create").onclick=async()=>{let r=await fetch("/api/room/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:$("hostName").value})}),d=await r.json();code=d.code;hostId=d.hostId;socket.emit("room:join",{code,name:$("hostName").value,hostId})};
socket.on("room:joined",async d=>{ $("created").classList.remove("hidden");$("roomCode").textContent="MÃ PHÒNG: "+d.code;let q=await fetch("/api/room/"+d.code+"/qr"),j=await q.json();$("qr").src=j.qr;url=j.url;$("url").textContent=url});
socket.on("room:state",s=>{$("roster").innerHTML=s.players.map(p=>`<p>${p.avatar} ${p.name} ${p.host?"👑":""} · ${p.connected?"Online":"Offline"}</p>`).join("");$("start").disabled=s.players.length<2||s.status!=="lobby"});
socket.on("game:error",toast);$("start").onclick=()=>socket.emit("game:start");$("copy").onclick=async()=>{try{await navigator.clipboard.writeText(url);toast("Đã sao chép link")}catch(e){toast(url)}};
