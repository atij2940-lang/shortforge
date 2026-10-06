const form = document.getElementById("form");
const input = document.getElementById("video");
const drop = document.getElementById("dropzone");
const fileTitle = document.getElementById("fileTitle");
const fileSub = document.getElementById("fileSub");
const submitBtn = document.getElementById("submitBtn");
const progress = document.getElementById("progress");
const bar = document.getElementById("bar");
const percent = document.getElementById("percent");
const status = document.getElementById("status");
const errorBox = document.getElementById("error");
const results = document.getElementById("results");
const resultGrid = document.getElementById("resultGrid");
const newBtn = document.getElementById("newBtn");

drop.addEventListener("click", () => input.click());
input.addEventListener("change", () => setFile(input.files[0]));

["dragenter","dragover"].forEach(e => drop.addEventListener(e, ev => {
  ev.preventDefault(); drop.classList.add("drag");
}));
["dragleave","drop"].forEach(e => drop.addEventListener(e, ev => {
  ev.preventDefault(); drop.classList.remove("drag");
}));
drop.addEventListener("drop", ev => {
  const f = ev.dataTransfer.files?.[0];
  if (f) { input.files = ev.dataTransfer.files; setFile(f); }
});

function setFile(file){
  if(!file) return;
  fileTitle.textContent = file.name;
  fileSub.textContent = `${(file.size/1024/1024).toFixed(1)} MB • প্রস্তুত`;
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  hide(errorBox); hide(results);
  const file = input.files[0];
  if(!file) return showError("আগে একটি ভিডিও নির্বাচন করুন।");

  const fd = new FormData();
  fd.append("video", file);
  fd.append("count", document.getElementById("count").value);
  fd.append("duration", document.getElementById("duration").value);

  submitBtn.disabled = true;
  show(progress);
  setProgress(8, "ভিডিও আপলোড হচ্ছে…");

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/create-shorts");

  xhr.upload.onprogress = ev => {
    if(ev.lengthComputable){
      const p = Math.round((ev.loaded/ev.total)*45);
      setProgress(Math.max(8,p), "ভিডিও আপলোড হচ্ছে…");
    }
  };

  xhr.onload = () => {
    try{
      const data = JSON.parse(xhr.responseText);
      if(xhr.status >= 400) throw new Error(data.error || "সমস্যা হয়েছে");
      setProgress(100, "Shorts তৈরি সম্পন্ন ✓");
      renderResults(data.results);
      show(results);
      results.scrollIntoView({behavior:"smooth", block:"start"});
    }catch(err){ showError(err.message); }
    finally { submitBtn.disabled = false; }
  };

  xhr.onerror = () => { showError("সার্ভারে সংযোগ করা যায়নি।"); submitBtn.disabled=false; };
  xhr.send(fd);

  // Processing stage: indeterminate-ish visual progress until server responds.
  let p = 48;
  const timer = setInterval(()=>{
    if(xhr.readyState === 4){ clearInterval(timer); return; }
    p = Math.min(92, p + Math.random()*5);
    setProgress(Math.round(p), "Shorts তৈরি হচ্ছে…");
  }, 900);
});

function renderResults(items){
  resultGrid.innerHTML = "";
  items.forEach((x,i)=>{
    const el=document.createElement("article");
    el.className="result";
    el.innerHTML=`
      <video controls preload="metadata" src="${x.url}"></video>
      <div class="result-body">
        <div class="result-title">Short ${i+1}</div>
        <div class="result-meta">${x.duration}s • 9:16 • start ${x.start}s</div>
        <a class="download" href="${x.url}" download>⬇ MP4 Download</a>
      </div>`;
    resultGrid.appendChild(el);
  });
}

newBtn.addEventListener("click", ()=>{
  input.value=""; fileTitle.textContent="ভিডিও এখানে টেনে আনুন"; fileSub.textContent="অথবা ক্লিক করে MP4/MOV/WebM বেছে নিন";
  hide(results); window.scrollTo({top:0,behavior:"smooth"});
});
function setProgress(p,msg){bar.style.width=p+"%";percent.textContent=p+"%";status.textContent=msg}
function show(el){el.classList.remove("hidden")}
function hide(el){el.classList.add("hidden")}
function showError(msg){hide(progress);errorBox.textContent=msg;show(errorBox);submitBtn.disabled=false}
