const pages = {home:'首页',finance:'我的财务',goals:'我的目标',travel:'我的旅行',learning:'我的学习',interests:'我的兴趣',future:'我的未来',journal:'我的记录',collection:'我的收藏'};
const DEMO_DATA_VERSION = 'empty-demo-v1';
if (localStorage.getItem('life-assistant-demo-version') !== DEMO_DATA_VERSION) {
  ['life-assistant-tasks','life-assistant-finance','life-assistant-habits','life-assistant-expenses'].forEach(key=>localStorage.removeItem(key));
  localStorage.setItem('life-assistant-demo-version', DEMO_DATA_VERSION);
}
const saved = JSON.parse(localStorage.getItem('life-assistant-tasks') || 'null') || [
  {text:'英语学习30分钟',time:'学习',done:false},{text:'吉他练习15分钟',time:'兴趣',done:false},{text:'阅读20分钟',time:'成长',done:false}
];
let tasks = saved;
const financeState = JSON.parse(localStorage.getItem('life-assistant-finance') || 'null') || {income:0, expense:0, balance:0, saved:0, target:0};
Object.assign(financeState,{lastIncome:financeState.lastIncome ?? 0,lastExpense:financeState.lastExpense ?? 0,lastBalance:financeState.lastBalance ?? 0});
const travelState = JSON.parse(localStorage.getItem('life-assistant-travel') || 'null') || {qinghaiBudget:0, qinghaiYear:'', yunnanBudget:0, yunnanYear:''};
Object.assign(travelState,{qinghaiImage:travelState.qinghaiImage || '',yunnanImage:travelState.yunnanImage || ''});
let currentPage = 'home';
const defaultNav = [
  {id:'home',icon:'⌂'}, {id:'finance',icon:'◌'}, {id:'goals',icon:'☆'}, {id:'travel',icon:'✈'}, {id:'learning',icon:'▤'}, {id:'interests',icon:'♧'}, {id:'future',icon:'⌂'}, {id:'journal',icon:'▣'}, {id:'collection',icon:'♡'}
];
let navConfig = JSON.parse(localStorage.getItem('life-assistant-nav') || 'null') || defaultNav;
const navNames = JSON.parse(localStorage.getItem('life-assistant-nav-names') || 'null') || {};
const app = document.querySelector('#app');
const toast = (text='已保存') => { const el=document.querySelector('#toast'); el.textContent=text; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),1800); };
const money = n => `¥${n.toLocaleString('zh-CN',{minimumFractionDigits:2})}`;
const numberValue = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const persistFinance = () => localStorage.setItem('life-assistant-finance', JSON.stringify(financeState));
const persistTravel = () => localStorage.setItem('life-assistant-travel', JSON.stringify(travelState));
function editableAmount(value, key, className='amount-input') { return `<input class="${className}" type="number" min="0" step="0.01" value="${numberValue(value)}" data-finance-key="${key}" aria-label="编辑金额" />`; }
function editableYear(value, key) { return `<input class="year-input" type="number" min="2026" max="2100" value="${value || ''}" placeholder="未设置" data-travel-key="${key}" aria-label="编辑计划年份" />`; }
function compareText(current, previous){ if(!previous) return '暂无基准'; const rate=(current-previous)/previous*100; return `${rate>=0?'+':''}${rate.toFixed(0)}%`; }
function comparisonHTML(current, previous, key, down=false){ return `<span class="trend ${down?'down':''} comparison-trend"><span>上月</span><span class="comparison-money">¥</span>${editableAmount(previous,key,'comparison-input')}<b>${compareText(current,previous)}</b></span>`; }
function bindEditableFields(){
  document.querySelectorAll('[data-finance-key]').forEach(input=>input.addEventListener('change',()=>{ financeState[input.dataset.financeKey]=numberValue(input.value); persistFinance(); currentPage==='finance' ? modulePage('finance') : home(); toast('金额已保存'); }));
  document.querySelectorAll('[data-travel-key]').forEach(input=>input.addEventListener('change',()=>{ travelState[input.dataset.travelKey]=input.value; persistTravel(); home(); toast('旅行计划已保存'); }));
}
function renderNav(){
  const nav = document.querySelector('.nav-list');
  nav.innerHTML = navConfig.map(item=>`<div class="nav-item ${currentPage===item.id?'active':''}" data-page="${item.id}"><span>${item.icon}</span><span class="nav-label">${navNames[item.id] || pages[item.id]}</span><span class="nav-tools"><button class="nav-more" data-nav-menu="${item.id}" aria-label="${navNames[item.id] || pages[item.id]}设置">•••</button></span></div>`).join('');
  let lastTouchNavigation=0;
  nav.querySelectorAll('.nav-item').forEach(item=>{
    const openPage=()=>navigate(item.dataset.page);
    let touchStart=null;
    item.addEventListener('touchstart',event=>{
      const touch=event.touches[0];
      touchStart=touch?{x:touch.clientX,y:touch.clientY,moved:false}:null;
    },{passive:true});
    item.addEventListener('touchmove',event=>{
      if(!touchStart)return;
      const touch=event.touches[0];
      if(touch && (Math.abs(touch.clientX-touchStart.x)>10 || Math.abs(touch.clientY-touchStart.y)>10))touchStart.moved=true;
    },{passive:true});
    item.addEventListener('touchend',event=>{
      if(window.innerWidth>520 || !touchStart || touchStart.moved || event.target.closest('.nav-more')){touchStart=null;return}
      touchStart=null;
      lastTouchNavigation=Date.now();
      event.preventDefault();
      event.stopPropagation();
      openPage();
    },{passive:false});
    item.addEventListener('touchcancel',()=>{touchStart=null},{passive:true});
    item.addEventListener('click',event=>{
      if(event.target.closest('.nav-more') || Date.now()-lastTouchNavigation<700)return;
      openPage();
    });
  });
  nav.querySelectorAll('.nav-more').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation(); openNavMenu(button.dataset.navMenu, button)}));
}
function openNavMenu(id, anchor){
  document.querySelector('.nav-popover')?.remove();
  const index = navConfig.findIndex(item=>item.id===id);
  const pop = document.createElement('div'); pop.className='nav-popover';
  pop.innerHTML=`<button data-nav-action="rename">重命名</button><button data-nav-action="up" ${index===0?'disabled':''}>↑ 上移</button><button data-nav-action="down" ${index===navConfig.length-1?'disabled':''}>↓ 下移</button>`;
  anchor.closest('.nav-item').appendChild(pop);
  pop.querySelector('[data-nav-action="rename"]').onclick=()=>{const name=prompt('请输入新的模块名称',navNames[id] || pages[id]);if(name?.trim()){navNames[id]=name.trim();localStorage.setItem('life-assistant-nav-names',JSON.stringify(navNames));renderNav();toast('名称已保存')}};
  pop.querySelector('[data-nav-action="up"]').onclick=()=>moveNav(id,-1);
  pop.querySelector('[data-nav-action="down"]').onclick=()=>moveNav(id,1);
}
function moveNav(id, direction){const index=navConfig.findIndex(item=>item.id===id), next=index+direction;if(next<0||next>=navConfig.length)return;[navConfig[index],navConfig[next]]=[navConfig[next],navConfig[index]];localStorage.setItem('life-assistant-nav',JSON.stringify(navConfig));renderNav();toast('导航顺序已更新')}
function mountHomeEditors(){
  const stats = document.querySelectorAll('.stats-grid .stat-card');
  if(stats.length){
    stats[0].querySelector('strong').innerHTML = editableAmount(financeState.income,'income');
    stats[1].querySelector('strong').innerHTML = editableAmount(financeState.expense,'expense');
    stats[2].querySelector('strong').innerHTML = editableAmount(financeState.balance,'balance');
    stats[3].querySelector('strong').innerHTML = editableAmount(financeState.saved,'saved');
    stats[3].querySelector('.goal-progress i').style.width = `${financeState.target ? Math.min(100, financeState.saved / financeState.target * 100) : 0}%`;
    stats[3].querySelector('.goal-meta span:last-child').innerHTML = `${money(financeState.saved)} / ${money(financeState.target)}`;
    stats[3].querySelector('.goal-meta span:first-child').textContent = '2026';
    stats[0].querySelector('.trend').outerHTML = comparisonHTML(financeState.income,financeState.lastIncome,'lastIncome');
    stats[1].querySelector('.trend').outerHTML = comparisonHTML(financeState.expense,financeState.lastExpense,'lastExpense',true);
    stats[2].querySelector('.trend').outerHTML = comparisonHTML(financeState.balance,financeState.lastBalance,'lastBalance');
  }
  const travelCards = document.querySelectorAll('.travel-grid .travel-card');
  if(travelCards.length >= 2){
    const qinghai = travelCards[0].querySelectorAll('.travel-info p');
    const yunnan = travelCards[1].querySelectorAll('.travel-info p');
    qinghai[0].innerHTML = `预算：${editableAmount(travelState.qinghaiBudget,'qinghaiBudget','amount-input travel-input')}`;
    qinghai[1].innerHTML = `计划时间：${editableYear(travelState.qinghaiYear,'qinghaiYear')}`;
    yunnan[0].innerHTML = `预算：${editableAmount(travelState.yunnanBudget,'yunnanBudget','amount-input travel-input')}`;
    yunnan[1].innerHTML = `计划时间：${editableYear(travelState.yunnanYear,'yunnanYear')}`;
    const visuals=[{node:travelCards[0].querySelector('.travel-visual'),name:'青海',key:'qinghaiImage'},{node:travelCards[1].querySelector('.travel-visual'),name:'云南',key:'yunnanImage'}];
    visuals.forEach(({node,name,key})=>{ node.dataset.imageLabel=travelState[key]?'已设置图片 · 点击更换':`${name} · 点击编辑图片`; if(travelState[key]) node.style.backgroundImage=`url(${travelState[key]})`; node.onclick=()=>{const url=prompt(`请输入${name}图片地址（留空恢复默认插图）`,travelState[key]);if(url!==null){travelState[key]=url.trim();persistTravel();home();toast('旅行图片已保存')}}; });
  }
  bindEditableFields();
}
function shell(title, body){ document.querySelector('#pageLabel').textContent=title; app.innerHTML=`<div class="page">${body}</div>`; }
function taskHTML(){ return tasks.map((t,i)=>`<div class="task-row ${t.done?'done':''}"><button class="check ${t.done?'done':''}" data-task="${i}" aria-label="${t.done?'取消完成':'完成'}">${t.done?'✓':''}</button><span class="task-text">${t.text}</span><span class="task-time">${t.time}</span></div>`).join(''); }
function home(){ shell('首页',`<section class="hero"><div><p class="eyebrow">MONDAY · JULY 13, 2026</p><h1>早上好，<em>晴天</em> <span aria-hidden="true">☀️</span></h1><p class="hero-sub">慢慢来，也很好。今天也为想要的生活，留一点时间。</p></div><div class="year-card"><div class="label"><span>2026 年剩余时间</span><span>54%</span></div><strong>还有 171 天</strong><div class="year-progress"><i></i></div><small>一步一步，走成自己的节奏</small></div></section>
<div class="grid stats-grid"><div class="card stat-card"><div class="card-top"><span>本月收入</span><span class="dot"></span></div><strong>${money(6000)}</strong><span class="trend">较上月 +10%</span></div><div class="card stat-card"><div class="card-top"><span>本月支出</span><span class="dot" style="background:var(--peach)"></span></div><strong>${money(3900)}</strong><span class="trend down">较上月 -8%</span></div><div class="card stat-card"><div class="card-top"><span>本月结余</span><span class="dot" style="background:var(--yellow)"></span></div><strong>${money(2100)}</strong><span class="trend">较上月 +25%</span></div><div class="card stat-card"><div class="card-top"><span>储蓄目标进度</span><span>12%</span></div><strong>${money(6000)}</strong><div class="goal-progress"><i style="width:12%"></i></div><div class="goal-meta"><span>独居基金</span><span>¥6,000 / ¥50,000</span></div></div></div>
<div class="grid middle-grid"><div class="card"><div class="card-header"><h2>今日计划</h2><span style="color:var(--muted);font-size:11px">${tasks.filter(t=>t.done).length} / ${tasks.length} 已完成</span></div><div>${taskHTML()}</div><button class="add-line" id="addTask">＋ 添加一项计划</button></div><div class="card"><div class="card-header"><h2>本月支出分类</h2><a data-page-link="finance">查看详情</a></div><div class="donut"></div><div class="legend"><div class="legend-row"><i style="background:#83a7c6"></i><span>家庭支持</span><b style="margin-left:auto">51%　¥2,000</b></div><div class="legend-row"><i style="background:#efaa95"></i><span>日常生活</span><b style="margin-left:auto">23%　¥900</b></div><div class="legend-row"><i style="background:#e8c486"></i><span>学习投资</span><b style="margin-left:auto">10%　¥400</b></div></div></div><div class="card"><div class="card-header"><h2>近期记录</h2><a data-page-link="journal">查看全部</a></div><div class="record-row"><span class="record-icon">▤</span><div><b>英语学习计划</b><small>开始于 2026.07.01</small></div><div class="ring"><span>60%</span></div></div><div class="record-row"><span class="record-icon" style="color:var(--peach)">▣</span><div><b>仅给自己的旅行笔记</b><small>开始于 2026.06.15</small></div><div class="ring" style="background:conic-gradient(var(--peach) 0 25%,#f2eee8 25%)"><span>25%</span></div></div><div class="record-row"><span class="record-icon" style="color:#d69b44">▥</span><div><b>想拥有的生活</b><small>开始于 2026.07.05</small></div><div class="ring"><span>40%</span></div></div></div></div>
<section class="section"><div class="section-title"><h2>我想去的地方</h2><a data-page-link="travel">查看地图 →</a></div><div class="grid travel-grid"><div class="card travel-card"><div class="travel-visual"></div><div class="travel-info"><h3>🏔 青海</h3><span class="pill">计划中</span><p>预算：¥5,000</p><p>计划时间：2027年</p></div></div><div class="card travel-card"><div class="travel-visual yunnan"></div><div class="travel-info"><h3>🌿 云南</h3><span class="pill" style="background:#faeee3;color:#c48668">想去</span><p>预算：¥4,000</p><p>计划时间：待定</p></div></div></div></section>`); bindHome(); }
function bindHome(){document.querySelectorAll('[data-page-link]').forEach(x=>x.onclick=()=>navigate(x.dataset.pageLink));document.querySelectorAll('[data-task]').forEach(x=>x.onclick=()=>{tasks[+x.dataset.task].done=!tasks[+x.dataset.task].done;localStorage.setItem('life-assistant-tasks',JSON.stringify(tasks));home();toast('计划已更新')});document.querySelector('#addTask').onclick=()=>{const text=prompt('想为今天添加什么？');if(text){tasks.push({text,time:'今日',done:false});localStorage.setItem('life-assistant-tasks',JSON.stringify(tasks));home();toast('已添加计划')}};mountHomeEditors()}
const moduleData={finance:{title:'我的财务',desc:'让每一笔钱，都更靠近你想要的生活。',cards:[['本月收入','¥6,000.00','来自工作与家庭支持'],['本月支出','¥3,900.00','日常生活 · 学习投资'],['本月存下','¥2,100.00','储蓄率 35%']]},goals:{title:'我的目标',desc:'把远方的愿望，拆成今天可以完成的一小步。',cards:[['英语提升','可以自然交流','60%'],['学习吉他','学会 5 首喜欢的歌','20%'],['独居基金','存下 ¥50,000','12%'],['开一家小店','有一个自己的小空间','8%'],['春日旅行','去看一次青海的湖','40%'],['阅读清单','读完 20 本书','15%']]},learning:{title:'我的学习',desc:'持续输入，也记得给自己一点成就感。',cards:[['英语','今日学习 30 分钟','连续打卡 12 天'],['产品设计','本周学习 2 小时','连续打卡 5 天'],['阅读','《山茶文具店》','本月读完 2 本']]},interests:{title:'我的兴趣',desc:'兴趣不是任务，是让生活发光的方式。',cards:[['♬ 吉他','正在练习《晴天》','本周练习 3 次'],['◉ 摄影','记录城市里的小风景','收藏 28 张照片'],['✦ 新尝试','想学做一杯手冲咖啡','排在清单第 2 位']]},future:{title:'我的未来',desc:'写下想拥有的生活，未来会慢慢回应你。',cards:[['想拥有的生活','有一间采光很好的小屋，窗边有植物和书。',''],['想开的店','一家安静的咖啡与花店，欢迎每个疲惫的人。',''],['想成为的人','温柔、坚定、拥有选择自己生活的能力。','']]},collection:{title:'我的收藏',desc:'把让你心动的东西，留给未来的自己。',cards:[['未来房间','自然光、木质家具、窗边的一盆绿植。','灵感 · 12'],['喜欢的咖啡店','下次想去坐一下午，写一封信。','地点 · 8'],['饮品店装修灵感','低饱和色、手写菜单和一束小花。','设计 · 16'] ]}};
function modulePage(key){const d=moduleData[key]; shell(d.title,`<div class="page-heading"><div><h1>${d.title}</h1><p>${d.desc}</p></div><button class="primary-btn" onclick="toast('这是一个轻量入口，后续可继续完善')">＋ 新建记录</button></div><div class="grid module-grid">${d.cards.map((c,i)=>`<div class="card module-card ${i===0&&key==='future'?'quote-card':''}"><span class="pill">${key==='goals'?'长期目标':key==='collection'?c[2]:'记录'}</span><h3>${c[0]}</h3><p>${c[1]}</p>${key==='goals'?`<div class="goal-progress"><i style="width:${parseInt(c[2])}%"></i></div><div class="goal-meta"><span>当前进度</span><span>${c[2]}</span></div>`:key==='finance'?`<div class="big-number">${c[1]}</div><p>${c[2]}</p>`:''}</div>`).join('')}</div>`)}
function travel(){shell('我的旅行',`<div class="page-heading"><div><h1>我的旅行</h1><p>去见山河，也去见更开阔的自己。</p></div><button class="primary-btn" onclick="toast('旅行愿望已保存')">＋ 添加地方</button></div><div class="card" style="margin-bottom:18px;min-height:180px;background:linear-gradient(120deg,#f3f2e9,#f9f7f0)"><div class="section-title"><h2>想去的世界</h2><span class="pill">已收藏 8 个地方</span></div><div style="height:100px;border-radius:14px;background:radial-gradient(circle at 28% 42%,#b7c7b0 0 3px,transparent 4px),radial-gradient(circle at 65% 55%,#e2bd8e 0 3px,transparent 4px),radial-gradient(circle at 73% 34%,#b2c2ce 0 3px,transparent 4px),linear-gradient(135deg,transparent 48%,#ebe9df 49% 51%,transparent 52%);opacity:.75"></div></div><div class="grid travel-grid"><div class="card travel-card"><div class="travel-visual"></div><div class="travel-info"><h3>🏔 青海</h3><span class="pill">计划中</span><p>预算：¥5,000</p><p>计划时间：2027年</p><p>想看：青海湖 · 茶卡盐湖</p></div></div><div class="card travel-card"><div class="travel-visual yunnan"></div><div class="travel-info"><h3>🌿 云南</h3><span class="pill" style="background:#faeee3;color:#c48668">想去</span><p>预算：¥4,000</p><p>计划时间：待定</p><p>想体验：慢生活 · 小城散步</p></div></div></div>`)}
function journal(){shell('我的记录',`<div class="page-heading"><div><h1>我的记录</h1><p>今天也值得被好好记住。</p></div><button class="primary-btn" id="saveJournal">保存日记</button></div><div class="card journal-box"><div class="section-title"><h2>2026年7月13日 · 星期一</h2><span class="pill">今天</span></div><label style="display:block;color:var(--muted);font-size:12px;margin:20px 0 8px">今天发生了什么？</label><textarea class="textarea" placeholder="记下此刻的想法、遇见的人和小小的片段……"></textarea><div class="grid" style="grid-template-columns:1fr 1fr;margin-top:18px"><div><label style="display:block;color:var(--muted);font-size:12px;margin-bottom:8px">今天开心的事情？</label><textarea class="textarea" style="min-height:90px" placeholder="一杯好喝的咖啡、路边的花……"></textarea></div><div><label style="display:block;color:var(--muted);font-size:12px;margin-bottom:8px">今天距离理想生活近了一点吗？</label><textarea class="textarea" style="min-height:90px" placeholder="哪怕只是一小步，也值得记录。"></textarea></div></div></div>`);document.querySelector('#saveJournal').onclick=()=>toast('今天的记录已保存')}
function navigate(page){document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page===page));if(page==='home')home();else if(page==='travel')travel();else if(page==='journal')journal();else modulePage(page);document.querySelector('.sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'})}
document.querySelectorAll('.nav-item').forEach(x=>x.onclick=()=>navigate(x.dataset.page));document.querySelector('.mobile-menu').onclick=()=>document.querySelector('.sidebar').classList.toggle('open');home();
function mountFinanceEditors(){
  const keys=['income','expense','balance'];
  document.querySelectorAll('.module-grid .module-card .big-number').forEach((node,index)=>{ if(keys[index]) node.innerHTML=editableAmount(financeState[keys[index]],keys[index],'amount-input module-amount'); });
  bindEditableFields();
}
const baseModulePage = modulePage;
modulePage = function(key){ baseModulePage(key); if(key==='finance') mountFinanceEditors(); };
renderNav();

showExpenseDetail=function(){previousShowExpenseDetailForRecycle();document.querySelectorAll('.editable-expense-row').forEach(row=>{if(row.querySelector('.expense-trash-button'))return;const button=document.createElement('button');button.type='button';button.className='expense-trash-button';button.textContent='🗑';button.dataset.expenseIndex=row.querySelector('[data-expense-index]')?.dataset.expenseIndex;button.setAttribute('aria-label','移入回收站');row.appendChild(button)})};

/* Scene homepage: a clean render path that does not reuse the legacy dashboard DOM. */
function sceneYearData(){
  const today=new Date();today.setHours(0,0,0,0);
  const year=today.getFullYear(),start=new Date(year,0,1),next=new Date(year+1,0,1);
  const total=Math.round((next-start)/86400000),days=Math.max(0,Math.ceil((next-today)/86400000));
  return {year,days,percent:Math.round(days/total*100)};
}
function sceneTaskRows(indexes){
  if(!indexes.length)return '<div class="scene-empty">今天还没有计划，留一点时间给自己吧。</div>';
  return indexes.slice(0,5).map(index=>{const task=tasks[index];return `<div class="scene-task-row ${task.done?'done':''}"><button class="scene-check ${task.done?'done':''}" data-scene-task="${index}" aria-label="${task.done?'取消完成':'完成'}">${task.done?'✓':''}</button><button class="scene-task-name" data-scene-edit-task="${index}">${escapeHTML(task.text)}</button><span>${escapeHTML(task.time||'生活')}</span></div>`}).join('');
}
function sceneHabitRows(){
  if(!habitState.length)return '<div class="scene-empty">还没有习惯，添加一个想坚持的小目标吧。</div>';
  return habitState.slice(0,2).map((habit,index)=>{const done=habit.days.filter(Boolean).length,percent=Math.round(done/31*100),streak=habitStreak(habit.days);return `<article class="scene-habit" data-scene-habit="${index}"><div class="scene-habit-icon">${index===0?'▣':'♬'}</div><div class="scene-habit-body"><div class="scene-habit-head"><div><h3>${escapeHTML(habit.name)}</h3><p>目标：${escapeHTML(habit.target)}</p></div><button class="scene-habit-more" data-scene-habit-menu="${index}">⋮</button></div><div class="scene-habit-meta"><span>完成 <b>${done}/31天</b></span><span>连续 <b>${streak}天</b></span></div><div class="scene-progress"><i style="width:${percent}%"></i></div><button class="scene-habit-view" data-scene-habit-view="${index}">${percent}%　查看详情 →</button></div></article>`}).join('');
}
function sceneTravelCards(){
  return travelPlaces.slice(0,2).map((place,index)=>{const image=place.image?`style="background-image:url('${escapeHTML(place.image)}')"`:'';return `<article class="scene-postcard"><div class="scene-postcard-image scene-postcard-${index}" ${image}></div><div class="scene-postcard-copy"><div class="scene-postcard-title"><h3>⌖ ${escapeHTML(place.name)}</h3><span>♡</span></div><b class="scene-status ${index===1?'warm':''}">${escapeHTML(place.status||'想去')}</b><p>预算：¥${numberValue(place.budget).toFixed(0)}</p><p>计划时间：${escapeHTML(place.year||'未设置')}</p><small>${escapeHTML(place.note||'把想去的地方，慢慢走成回忆。')}</small><div class="scene-postmark">${index===0?'QINGHAI LAKE':'DALI · YUNNAN'}</div></div></article>`}).join('');
}
function renderSceneHomepage(){
  syncExpenseTotals();
  const year=sceneYearData();
  const taskIndexes=tasks.map((task,index)=>index).filter(index=>taskDateValue(index)===TODAY_PLAN_DATE);
  const doneCount=taskIndexes.filter(index=>tasks[index].done).length;
  shell('首页',`<main class="scene-home">
    <section class="scene-hero">
      <div class="scene-hero-copy"><p>上午好，愿你拥有美好的一天 ☀️</p><h1>今天也要慢慢变好</h1><span>慢慢来，也很好。今天也为想要的生活，留一点时间。</span></div>
      <aside class="scene-year-card year-card"><div class="label"><span>${year.year} 年剩余时间</span><b>${year.percent}%</b></div><strong>还有 ${year.days} 天</strong><div class="year-progress"><i style="width:${year.percent}%"></i></div><small>一步一步，走成自己的节奏</small><div class="scene-mountain-line">⌁　⌁⌁　⌁</div></aside>
    </section>
    <section class="scene-core-grid">
      <article class="scene-glass-card scene-plan-card"><header><h2>今日计划</h2><span>${doneCount} / ${taskIndexes.length} 已完成</span><button id="sceneAllTasks">查看全部 →</button></header><div class="scene-task-list">${sceneTaskRows(taskIndexes)}</div><button class="scene-add" id="sceneAddTask">＋ 添加一项计划</button></article>
      <article class="scene-glass-card scene-expense-card"><header><h2>本月支出分类</h2><button id="sceneExpenseDetail">查看详情 →</button></header><div class="scene-expense-content">${expenseChartMarkup()}</div></article>
      <article class="scene-glass-card scene-habits-card"><header><h2>习惯打卡</h2><button id="sceneAddHabit">＋ 添加习惯</button></header><div class="scene-habit-list">${sceneHabitRows()}</div></article>
    </section>
    <section class="scene-travel"><header><h2>▣　我想去的地方</h2><button id="sceneTravelPage">查看地图　›</button></header><div class="scene-postcard-grid">${sceneTravelCards()}</div></section>
  </main>`);
  const page=document.querySelector('.page');if(page)page.className='page scene-page';
  document.querySelector('#sceneAddTask').onclick=()=>taskModal(null,TODAY_PLAN_DATE);
  document.querySelector('#sceneAllTasks').onclick=()=>showTaskDetail(TODAY_PLAN_DATE);
  document.querySelectorAll('[data-scene-task]').forEach(button=>button.onclick=()=>{const index=Number(button.dataset.sceneTask);tasks[index].done=!tasks[index].done;tasks[index].completedAt=tasks[index].done?new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):null;saveTasks();home()});
  document.querySelectorAll('[data-scene-edit-task]').forEach(button=>button.onclick=()=>taskModal(Number(button.dataset.sceneEditTask),TODAY_PLAN_DATE));
  document.querySelector('#sceneExpenseDetail').onclick=showExpenseDetail;
  document.querySelector('#sceneAddHabit').onclick=habitModal;
  document.querySelectorAll('[data-scene-habit-view]').forEach(button=>button.onclick=event=>{event.stopPropagation();showHabitDetail(Number(button.dataset.sceneHabitView))});
  document.querySelectorAll('[data-scene-habit]').forEach(card=>card.onclick=event=>{if(!event.target.closest('button'))showHabitDetail(Number(card.dataset.sceneHabit))});
  document.querySelectorAll('[data-scene-habit-menu]').forEach(button=>button.onclick=event=>{event.stopPropagation();const index=Number(button.dataset.sceneHabitMenu),habit=habitState[index],name=prompt('修改习惯名称',habit.name);if(name?.trim()){habit.name=name.trim();saveHabits();home();toast('习惯已保存')}});
  document.querySelector('#sceneTravelPage').onclick=()=>navigate('travel');
}
document.addEventListener('click',event=>{const button=event.target.closest('.expense-trash-button');if(!button)return;event.preventDefault();event.stopImmediatePropagation();if(!confirm('确定将这条内容移入回收站吗？'))return;const index=Number(button.dataset.expenseIndex),data=expenseRecords[index];moveToRecycle('finance','本月支出',`${data?.category||'支出'} ¥${numberValue(data?.amount).toFixed(2)}`,{key:'expense-record',index,data});expenseRecords.splice(index,1);saveExpenses();syncExpenseTotals();showExpenseDetail();toast('已移入回收站')},true);
const baseNavigate = navigate;
navigate = function(page){ currentPage=page; baseNavigate(page); };
function enhanceTasks(){
  document.querySelectorAll('.task-row').forEach((row,index)=>{
    const tools=document.createElement('span'); tools.className='task-tools';
    const edit=document.createElement('button'); edit.className='task-edit'; edit.textContent='重命名'; edit.setAttribute('aria-label','重命名任务');
    edit.onclick=()=>{const name=prompt('请输入新的任务名称',tasks[index].text);if(name?.trim()){tasks[index].text=name.trim();localStorage.setItem('life-assistant-tasks',JSON.stringify(tasks));home();toast('任务名称已保存')}};
    tools.appendChild(edit); row.appendChild(tools);
  });
  const add=document.querySelector('#addTask');
  if(add) add.onclick=()=>{
    if(document.querySelector('.task-add-form')) return;
    const form=document.createElement('form'); form.className='task-add-form'; form.innerHTML='<input type="text" placeholder="输入今天想完成的事" aria-label="新任务名称" required><button type="submit">添加</button><button type="button" class="cancel-task">取消</button>';
    add.replaceWith(form); form.querySelector('input').focus();
    form.onsubmit=(event)=>{event.preventDefault();const text=form.querySelector('input').value.trim();if(text){tasks.push({text,time:'今日',done:false});localStorage.setItem('life-assistant-tasks',JSON.stringify(tasks));home();toast('计划已添加')}};
    form.querySelector('.cancel-task').onclick=()=>home();
  };
}
const baseBindHome = bindHome;
bindHome = function(){ baseBindHome(); enhanceTasks(); };
enhanceTasks();
/* Homepage-only productivity modules */
const taskCategories = ['学习','兴趣','生活','成长','健康'];
const habitCategories = ['学习','兴趣','健康','生活'];
let habitState = JSON.parse(localStorage.getItem('life-assistant-habits') || 'null') || [
  {name:'每日学习英语', target:'每天学习30分钟', category:'学习', days:Array(31).fill(false)},
  {name:'每日练习吉他', target:'每天练习吉他15分钟', category:'兴趣', days:Array(31).fill(false)}
];
const saveTasks = () => localStorage.setItem('life-assistant-tasks', JSON.stringify(tasks));
const saveHabits = () => localStorage.setItem('life-assistant-habits', JSON.stringify(habitState));
const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

function taskModal(index=null){
  document.querySelector('.task-modal')?.remove();
  const item=index===null?{text:'',time:'学习',reminder:false}:tasks[index];
  const modal=document.createElement('div'); modal.className='task-modal';
  modal.innerHTML=`<div class="task-modal-backdrop"></div><form class="task-modal-card"><div class="task-modal-header"><div><span class="eyebrow">TODAY PLAN</span><h3>${index===null?'添加一项计划':'编辑计划'}</h3></div><button type="button" class="modal-close" aria-label="关闭">×</button></div><label>计划名称<input name="name" value="${escapeHTML(item.text)}" placeholder="例如：英语学习30分钟" required></label><label>分类<select name="category">${taskCategories.map(category=>`<option ${item.time===category?'selected':''}>${category}</option>`).join('')}</select></label><label class="reminder-option"><input type="checkbox" name="reminder" ${item.reminder?'checked':''}> 设置提醒（功能预留）</label><div class="task-modal-actions"><button type="button" class="modal-cancel">取消</button><button type="submit" class="primary-btn">保存计划</button></div></form>`;
  document.body.appendChild(modal); modal.querySelector('[name="name"]').focus();
  const close=()=>modal.remove(); modal.querySelector('.modal-close').onclick=close; modal.querySelector('.modal-cancel').onclick=close; modal.querySelector('.task-modal-backdrop').onclick=close;
  modal.querySelector('form').onsubmit=event=>{event.preventDefault();const form=new FormData(event.currentTarget);const next={text:String(form.get('name')).trim(),time:String(form.get('category')),reminder:form.get('reminder')==='on',done:index===null?false:tasks[index].done};if(index===null)tasks.push(next);else tasks[index]=next;saveTasks();close();home();toast(index===null?'计划已添加':'计划已保存')};
}
function taskMenu(index, anchor){
  document.querySelector('.task-popover')?.remove(); const pop=document.createElement('div'); pop.className='task-popover'; pop.innerHTML='<button data-action="edit">编辑</button><button data-action="up">↑ 上移</button><button data-action="down">↓ 下移</button><button data-action="delete">删除</button>'; anchor.closest('.task-row').appendChild(pop);
  pop.querySelector('[data-action="edit"]').onclick=()=>{pop.remove();taskModal(index)};
  pop.querySelector('[data-action="delete"]').onclick=()=>{tasks.splice(index,1);saveTasks();pop.remove();home();toast('计划已删除')};
  pop.querySelector('[data-action="up"]').onclick=()=>{if(index>0){[tasks[index-1],tasks[index]]=[tasks[index],tasks[index-1]];saveTasks();home();}};
  pop.querySelector('[data-action="down"]').onclick=()=>{if(index<tasks.length-1){[tasks[index+1],tasks[index]]=[tasks[index],tasks[index+1]];saveTasks();home();}};
}
function upgradeTaskModule(){
  const card=[...document.querySelectorAll('.middle-grid > .card')].find(item=>item.querySelector('#addTask')); if(!card)return;
  card.querySelectorAll('.task-tools,.task-popover').forEach(node=>node.remove());
  card.querySelectorAll('.task-row').forEach((row,index)=>{
    const text=row.querySelector('.task-text'); if(text){text.onclick=()=>taskModal(index);text.title='点击编辑计划';}
    const tools=document.createElement('span'); tools.className='task-tools'; const more=document.createElement('button'); more.className='task-more'; more.textContent='⋮'; more.setAttribute('aria-label','计划操作'); more.onclick=event=>{event.stopPropagation();taskMenu(index,more)}; tools.appendChild(more); row.appendChild(tools);
  });
  const add=card.querySelector('#addTask'); if(add){add.onclick=()=>taskModal();add.textContent='＋ 添加一项计划';}
}
function habitStreak(days){let count=0;for(let i=days.length-1;i>=0&&days[i];i--)count++;return count;}
function habitCard(habit,index){const done=habit.days.filter(Boolean).length, percent=Math.round(done/31*100), streak=habitStreak(habit.days);return `<div class="habit-card"><div class="habit-card-top"><div><h3>${escapeHTML(habit.name)}</h3><p>目标：${escapeHTML(habit.target)}</p></div><button class="habit-more" data-habit-menu="${index}">⋮</button></div><div class="habit-stats"><span>本月完成：<b>${done} / 31天</b></span><span>连续打卡：<b>${streak}天</b></span></div><div class="habit-progress"><i style="width:${percent}%"></i></div><div class="habit-progress-label"><span>${percent}%</span><span>${habit.category}</span></div><div class="habit-days">${habit.days.map((checked,day)=>`<button class="habit-day ${checked?'checked':''}" data-habit="${index}" data-day="${day}" aria-label="第${day+1}天">${checked?'●':'○'}</button>`).join('')}</div></div>`}
function habitModal(){document.querySelector('.habit-modal')?.remove();const modal=document.createElement('div');modal.className='habit-modal';modal.innerHTML='<div class="task-modal-backdrop"></div><form class="task-modal-card"><div class="task-modal-header"><div><span class="eyebrow">HABIT TRACKER</span><h3>添加习惯</h3></div><button type="button" class="modal-close">×</button></div><label>习惯名称<input name="name" placeholder="例如：每天学习吉他" required></label><label>目标周期<select name="cycle"><option>每天</option></select></label><label>分类<select name="category">'+habitCategories.map(category=>`<option>${category}</option>`).join('')+'</select></label><div class="task-modal-actions"><button type="button" class="modal-cancel">取消</button><button type="submit" class="primary-btn">保存习惯</button></div></form>';
  document.body.appendChild(modal); modal.querySelector('[name="name"]').focus(); const close=()=>modal.remove(); modal.querySelector('.modal-close').onclick=close;modal.querySelector('.modal-cancel').onclick=close;modal.querySelector('.task-modal-backdrop').onclick=close;modal.querySelector('form').onsubmit=event=>{event.preventDefault();const form=new FormData(event.currentTarget);habitState.push({name:String(form.get('name')).trim(),target:'每天坚持一点点',category:String(form.get('category')),days:Array(31).fill(false)});saveHabits();close();home();toast('习惯已添加')};
}
function upgradeHabitModule(){
  const card=document.querySelector('.middle-grid > .card:nth-child(3)'); if(!card)return; card.innerHTML=`<div class="card-header"><h2>习惯打卡</h2><a class="habit-add">＋ 添加习惯</a></div><div class="habit-list">${habitState.map(habitCard).join('')}</div>`;
  card.querySelector('.habit-add').onclick=habitModal;
  card.querySelectorAll('.habit-day').forEach(day=>day.onclick=()=>{const habit=habitState[Number(day.dataset.habit)];const dayIndex=Number(day.dataset.day);habit.days[dayIndex]=!habit.days[dayIndex];saveHabits();home();});
  card.querySelectorAll('.habit-more').forEach(button=>button.onclick=()=>{const index=Number(button.dataset.habitMenu);const old=habitState[index];const name=prompt('修改习惯名称',old.name);if(name?.trim()){old.name=name.trim();saveHabits();home();toast('习惯已保存')}});
}
const baseDashboardHome = home;
home = function(){baseDashboardHome();upgradeTaskModule();upgradeHabitModule();};
upgradeTaskModule(); upgradeHabitModule();
/* Detail views for homepage plan and habit modules */
const TODAY_PLAN_DATE = '2026-07-13';
let visibleTaskIndexes = [];
let activePlanDate = TODAY_PLAN_DATE;
tasks = tasks.map(task=>({...task,date:task.date||TODAY_PLAN_DATE,completedAt:task.completedAt || (task.done?'20:30':null),reminder:!!task.reminder}));
saveTasks();
habitState = habitState.map(habit=>({...habit,days:Array.from({length:31},(_,i)=>!!(habit.days&&habit.days[i])),times:habit.times||{}}));
saveHabits();

function formatPlanDate(date){return date==='2026-07-13'?'7月13日':date==='2026-07-12'?'7月12日':date==='2026-07-11'?'7月11日':date;}
function taskDateValue(index){return tasks[index]?.date||TODAY_PLAN_DATE;}
function planRow(task,index,detail=false){return `<div class="detail-task-row ${task.done?'done':''}"><button class="check ${task.done?'done':''}" data-plan-check="${index}">${task.done?'✓':''}</button><div class="detail-task-main"><b>${escapeHTML(task.text)}</b><small>分类：${escapeHTML(task.time||'生活')} · ${task.done?`完成时间：${escapeHTML(task.completedAt||'已完成')}`:'未完成'}</small></div><div class="detail-task-actions"><button data-plan-edit="${index}">编辑</button><button data-plan-delete="${index}">删除</button>${detail?`<button data-plan-up="${index}">↑</button><button data-plan-down="${index}">↓</button>`:''}</div></div>`}
function bindPlanRows(date){
  document.querySelectorAll('[data-plan-check]').forEach(button=>button.onclick=()=>{const index=Number(button.dataset.planCheck);tasks[index].done=!tasks[index].done;tasks[index].completedAt=tasks[index].done?new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):null;saveTasks();showTaskDetail(date)});
  document.querySelectorAll('[data-plan-edit]').forEach(button=>button.onclick=()=>{activePlanDate=date;taskModal(Number(button.dataset.planEdit),date)});
  document.querySelectorAll('[data-plan-delete]').forEach(button=>button.onclick=()=>{tasks.splice(Number(button.dataset.planDelete),1);saveTasks();showTaskDetail(date);toast('计划已删除')});
  document.querySelectorAll('[data-plan-up]').forEach(button=>button.onclick=()=>moveTaskDetail(Number(button.dataset.planUp),-1,date));
  document.querySelectorAll('[data-plan-down]').forEach(button=>button.onclick=()=>moveTaskDetail(Number(button.dataset.planDown),1,date));
}
function moveTaskDetail(index,direction,date){const indexes=tasks.map((task,i)=>task.date===date?i:-1).filter(i=>i>=0),position=indexes.indexOf(index),next=position+direction;if(position<0||next<0||next>=indexes.length)return;[tasks[indexes[position]],tasks[indexes[next]]]=[tasks[indexes[next]],tasks[indexes[position]]];saveTasks();showTaskDetail(date)}
function showTaskDetail(date=TODAY_PLAN_DATE){
  activePlanDate=date; document.querySelector('#pageLabel').textContent='今日计划详情'; const dates=['2026-07-13','2026-07-12','2026-07-11']; const list=tasks.map((task,index)=>({task,index})).filter(item=>taskDateValue(item.index)===date);
  app.innerHTML=`<div class="page detail-page"><div class="page-heading"><div><button class="back-link" id="backHome">← 返回首页</button><h1>${formatPlanDate(date)} 今日计划</h1><p>把今天想完成的事，一件一件放在心上。</p></div><button class="primary-btn" id="detailAddPlan">＋ 添加计划</button></div><div class="detail-date-tabs">${dates.map(item=>`<button class="${item===date?'active':''}" data-plan-date="${item}">${formatPlanDate(item)}</button>`).join('')}</div><div class="card detail-list-card"><div class="card-header"><h2>全部计划</h2><span style="color:var(--muted);font-size:11px">${list.filter(item=>item.task.done).length} / ${list.length} 已完成</span></div><div>${list.length?list.map(item=>planRow(item.task,item.index,true)).join(''):'<div class="empty-state">这一天还没有计划，给自己安排一件小事吧。</div>'}</div></div></div>`;
  document.querySelector('#backHome').onclick=()=>home(); document.querySelector('#detailAddPlan').onclick=()=>{activePlanDate=date;taskModal(null,date)};document.querySelectorAll('[data-plan-date]').forEach(button=>button.onclick=()=>showTaskDetail(button.dataset.planDate));bindPlanRows(date);
}
function showHabitDetail(index){
  const habit=habitState[index]; document.querySelector('#pageLabel').textContent='习惯详情'; const done=habit.days.filter(Boolean).length,percent=Math.round(done/31*100),streak=habitStreak(habit.days);
  app.innerHTML=`<div class="page detail-page"><div class="page-heading"><div><button class="back-link" id="backHabitHome">← 返回首页</button><h1>${escapeHTML(habit.name)}</h1><p>目标：${escapeHTML(habit.target)}</p></div><span class="pill">${escapeHTML(habit.category)}</span></div><div class="grid habit-detail-grid"><div class="card habit-summary"><div class="section-title"><h2>本月进度</h2><span>${done} / 31天</span></div><div class="big-number">${percent}%</div><div class="goal-progress"><i style="width:${percent}%"></i></div><div class="goal-meta"><span>连续打卡</span><span>${streak}天</span></div></div><div class="card habit-calendar-card"><div class="card-header"><h2>2026年7月</h2><span style="color:var(--muted);font-size:11px">点击圆点完成打卡</span></div><div class="calendar-week">${['周一','周二','周三','周四','周五','周六','周日'].map(day=>`<span>${day}</span>`).join('')}</div><div class="habit-calendar">${Array.from({length:31},(_,day)=>{const dayNumber=day+1, future=dayNumber>13;return `<button class="calendar-day ${habit.days[day]?'checked':''} ${future?'future':''}" data-calendar-day="${day}" ${future?'disabled':''}><b>${dayNumber}</b><span>${future?'○':habit.days[day]?'●':'○'}</span></button>`}).join('')}</div><div class="calendar-note"><span class="checked-dot">●</span> 已完成 <span class="empty-dot">○</span> 未完成 <span class="future-dot">○</span> 未来日期</div></div></div><div class="card habit-log-card" id="habitLog"><h2>当天记录</h2><p>点击日历中的一天查看完成情况。</p></div></div>`;
  document.querySelector('#backHabitHome').onclick=()=>home();document.querySelectorAll('[data-calendar-day]').forEach(button=>button.onclick=()=>{const day=Number(button.dataset.calendarDay);habit.days[day]=!habit.days[day];habit.times[day]=habit.days[day]?new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):'';saveHabits();showHabitDetail(index);});
  document.querySelectorAll('[data-calendar-day]').forEach(button=>button.onmouseenter=()=>showHabitLog(habit,Number(button.dataset.calendarDay))); showHabitLog(habit,12);
}
function showHabitLog(habit,day){const log=document.querySelector('#habitLog');if(!log)return;const done=habit.days[day],time=habit.times?.[day]||'21:35';log.innerHTML=`<h2>${day+1}月${day+1}日</h2><p>${done?`完成：${escapeHTML(habit.target)}<br>时间：${time}`:'当天尚未完成打卡。'}</p>`}

const previousTaskModal = taskModal;
taskModal = function(index=null,date=activePlanDate){
  document.querySelector('.task-modal')?.remove(); const actual=index===null?null:index; const item=actual===null?{text:'',time:'学习',reminder:false}:{...tasks[actual]}; const modal=document.createElement('div');modal.className='task-modal';modal.innerHTML=`<div class="task-modal-backdrop"></div><form class="task-modal-card"><div class="task-modal-header"><div><span class="eyebrow">TODAY PLAN</span><h3>${actual===null?'添加一项计划':'编辑计划'}</h3></div><button type="button" class="modal-close">×</button></div><label>计划名称<input name="name" value="${escapeHTML(item.text)}" placeholder="例如：英语学习30分钟" required></label><label>分类<select name="category">${taskCategories.map(category=>`<option ${item.time===category?'selected':''}>${category}</option>`).join('')}</select></label><label class="reminder-option"><input type="checkbox" name="reminder" ${item.reminder?'checked':''}> 设置提醒（功能预留）</label><div class="task-modal-actions"><button type="button" class="modal-cancel">取消</button><button type="submit" class="primary-btn">保存计划</button></div></form>`;document.body.appendChild(modal);const close=()=>modal.remove();modal.querySelector('.modal-close').onclick=close;modal.querySelector('.modal-cancel').onclick=close;modal.querySelector('.task-modal-backdrop').onclick=close;modal.querySelector('form').onsubmit=event=>{event.preventDefault();const form=new FormData(event.currentTarget);const next={...(actual===null?{done:false}:tasks[actual]),text:String(form.get('name')).trim(),time:String(form.get('category')),reminder:form.get('reminder')==='on',date};if(actual===null)tasks.push(next);else tasks[actual]=next;saveTasks();close();date===TODAY_PLAN_DATE?home():showTaskDetail(date);toast('计划已保存')};modal.querySelector('[name="name"]').focus();
};
const oldUpgradeTaskModule = upgradeTaskModule;
upgradeTaskModule = function(){oldUpgradeTaskModule();const card=[...document.querySelectorAll('.middle-grid > .card')].find(item=>item.querySelector('#addTask'));if(!card)return;const header=card.querySelector('.card-header');if(header&&!header.querySelector('.view-all-plans')){const link=document.createElement('a');link.className='view-all-plans';link.textContent='查看全部 →';link.onclick=()=>showTaskDetail(TODAY_PLAN_DATE);header.appendChild(link)}card.querySelectorAll('.task-row').forEach((row,index)=>{const actual=visibleTaskIndexes[index]??index;const check=row.querySelector('.check');if(check)check.onclick=()=>{tasks[actual].done=!tasks[actual].done;tasks[actual].completedAt=tasks[actual].done?new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):null;saveTasks();home()};const text=row.querySelector('.task-text');if(text)text.onclick=()=>taskModal(actual,TODAY_PLAN_DATE)});};
const oldUpgradeHabitModule = upgradeHabitModule;
upgradeHabitModule = function(){oldUpgradeHabitModule();document.querySelectorAll('.habit-card').forEach((card,index)=>{card.onclick=event=>{if(!event.target.closest('button'))showHabitDetail(index)}})};
const previousHomeWithModules = home;
home = function(){const allTasks=tasks;visibleTaskIndexes=allTasks.map((task,index)=>({task,index})).filter(item=>taskDateValue(item.index)===TODAY_PLAN_DATE).map(item=>item.index);tasks=visibleTaskIndexes.map(index=>allTasks[index]);previousHomeWithModules();tasks=allTasks;upgradeTaskModule();upgradeHabitModule();};
home();
showHabitLog = function(habit,day){const log=document.querySelector('#habitLog');if(!log)return;const done=habit.days[day],time=habit.times?.[day]||'21:35';log.innerHTML=`<h2>7月${day+1}日</h2><p>${done?`完成：${escapeHTML(habit.target)}<br>时间：${time}`:'当天尚未完成打卡。'}</p>`};
const finalHomeWrapper = home;
function decorateReferenceHomepage(){
  const page=document.querySelector('.page');
  if(!page||!page.querySelector('.hero'))return;
  page.classList.add('reference-home');
  page.querySelector('.hero')?.setAttribute('data-scene','fuji-lake');
  page.querySelector('.middle-grid')?.setAttribute('data-layout','core-cards');
  page.querySelector('.travel-grid')?.setAttribute('data-layout','postcards');
}
home = function(){finalHomeWrapper();const add=document.querySelector('#addTask');if(add)add.onclick=()=>taskModal(null,TODAY_PLAN_DATE);decorateReferenceHomepage();};
home();
let expenseRecords = JSON.parse(localStorage.getItem('life-assistant-expenses') || 'null') || [];
const expenseCategories = ['家庭支持','房租','日常生活','学习投资','旅行基金','娱乐'];
const saveExpenses = () => localStorage.setItem('life-assistant-expenses',JSON.stringify(expenseRecords));
function expenseModal(){
  document.querySelector('.expense-modal')?.remove(); const modal=document.createElement('div');modal.className='expense-modal task-modal';modal.innerHTML=`<div class="task-modal-backdrop"></div><form class="task-modal-card"><div class="task-modal-header"><div><span class="eyebrow">EXPENSE</span><h3>添加支出</h3></div><button type="button" class="modal-close">×</button></div><label>金额<input name="amount" type="number" min="0" step="0.01" placeholder="0" required></label><label>分类<select name="category">${expenseCategories.map(category=>`<option>${category}</option>`).join('')}</select></label><div class="task-modal-actions"><button type="button" class="modal-cancel">取消</button><button type="submit" class="primary-btn">保存支出</button></div></form>`;document.body.appendChild(modal);const close=()=>modal.remove();modal.querySelector('.modal-close').onclick=close;modal.querySelector('.modal-cancel').onclick=close;modal.querySelector('.task-modal-backdrop').onclick=close;modal.querySelector('form').onsubmit=event=>{event.preventDefault();const form=new FormData(event.currentTarget);const amount=numberValue(form.get('amount'));expenseRecords.push({amount,category:String(form.get('category')),date:TODAY_PLAN_DATE});financeState.expense=expenseRecords.reduce((sum,item)=>sum+item.amount,0);financeState.balance=financeState.income-financeState.expense;persistFinance();saveExpenses();close();home();toast('支出已保存')};modal.querySelector('[name="amount"]').focus();
}
function expenseChartMarkup(){
  const total=expenseRecords.reduce((sum,item)=>sum+item.amount,0); if(!total)return '<div class="empty-expense"><div class="empty-donut">○</div><strong>暂无支出数据</strong><span>开始记录你的第一笔支出吧。</span></div>';
  let cursor=0;const colors=['#83a7c6','#efaa95','#e8c486','#bda9ca','#9eb18f','#c9b9a1'];const groups=expenseCategories.map((category,index)=>({category,amount:expenseRecords.filter(item=>item.category===category).reduce((sum,item)=>sum+item.amount,0),color:colors[index]})).filter(item=>item.amount>0);const gradient=groups.map(group=>{const start=cursor;cursor+=group.amount/total*100;return `${group.color} ${start}% ${cursor}%`}).join(',');return `<div class="real-expense-donut" style="background:conic-gradient(${gradient})"><div><b>¥${total.toFixed(2)}</b><span>本月支出</span></div></div><div class="legend">${groups.map(group=>`<div class="legend-row"><i style="background:${group.color}"></i><span>${group.category}</span><b style="margin-left:auto">${Math.round(group.amount/total*100)}%　¥${group.amount.toFixed(0)}</b></div>`).join('')}</div>`;
}
function upgradeExpenseModule(){
  const card=document.querySelector('.middle-grid > .card:nth-child(2)');if(!card)return;const link=card.querySelector('[data-page-link="finance"]');if(link){link.onclick=event=>{event.preventDefault();showExpenseDetail()}}const chart=card.querySelector('.donut');if(chart)chart.outerHTML=expenseRecords.length?expenseChartMarkup():`<div class="expense-chart-empty">${expenseChartMarkup()}</div>`;if(!expenseRecords.length){card.querySelector('.legend')?.remove();}
}
function showExpenseDetail(){document.querySelector('#pageLabel').textContent='支出分类';app.innerHTML=`<div class="page detail-page"><div class="page-heading"><div><button class="back-link" id="backExpenseHome">← 返回首页</button><h1>本月支出</h1><p>记录每一笔真实发生的消费。</p></div><button class="primary-btn" id="addExpense">＋ 添加第一笔支出</button></div><div class="card expense-detail-card">${expenseRecords.length?expenseRecords.map(item=>`<div class="record-row"><span class="record-icon">¥</span><div><b>${item.category}</b><small>${item.date}</small></div><strong style="margin-left:auto">¥${item.amount.toFixed(2)}</strong></div>`).join(''):'<div class="empty-state"><strong>本月暂无消费记录</strong><span>开始记录你的第一笔支出吧。</span></div>'}</div></div>`;document.querySelector('#backExpenseHome').onclick=()=>home();document.querySelector('#addExpense').onclick=expenseModal}
const baseModulePageForDemo = modulePage;
modulePage = function(key){baseModulePageForDemo(key);if(key==='goals'){document.querySelectorAll('.module-grid .goal-progress i').forEach(bar=>bar.style.width='0%');document.querySelectorAll('.module-grid .goal-meta span:last-child').forEach(label=>label.textContent='0%');}if(key==='finance'){document.querySelectorAll('.module-grid .module-card .big-number').forEach((node,index)=>{if(index<3)node.innerHTML=editableAmount([financeState.income,financeState.expense,financeState.balance][index],['income','expense','balance'][index],'amount-input module-amount')})}};
const priorHomeForDemo = home;
home = function(){priorHomeForDemo();upgradeExpenseModule();};
home();
function syncExpenseTotals(){
  const total=expenseRecords.reduce((sum,item)=>sum+numberValue(item.amount),0);
  financeState.expense=total;
  financeState.balance=numberValue(financeState.income)-total;
  moduleData.finance.cards=[['本月收入',money(financeState.income),'等待添加收入记录'],['本月支出',money(financeState.expense),total?'来自真实支出记录':'暂无支出记录'],['本月存下',money(financeState.balance),financeState.balance?'根据真实记录计算':'等待收入与支出记录']];
  persistFinance();
}
syncExpenseTotals();
const homeWithExpenseSync = home;
home = function(){syncExpenseTotals();homeWithExpenseSync();};
home();
const modulePageWithExpenseSync = modulePage;
modulePage = function(key){if(key==='finance')syncExpenseTotals();modulePageWithExpenseSync(key);};
expenseRecords = expenseRecords.map(item=>({...item,amount:numberValue(item.amount)}));
saveExpenses();
syncExpenseTotals();
home();
function renderExpenseCategoryFromSource(){
  const card=document.querySelector('.middle-grid > .card:nth-child(2)');
  if(!card)return;
  card.innerHTML='<div class="card-header"><h2>本月支出分类</h2><a class="expense-detail-link">查看详情</a></div>'+expenseChartMarkup();
  card.querySelector('.expense-detail-link').onclick=showExpenseDetail;
}
const sourceOnlyExpenseUpgrade=upgradeExpenseModule;
upgradeExpenseModule=function(){sourceOnlyExpenseUpgrade();renderExpenseCategoryFromSource();};
const sourceOnlyHome=home;
home=function(){syncExpenseTotals();sourceOnlyHome();renderExpenseCategoryFromSource();};
home();
function compactHabitCard(habit,index){const done=habit.days.filter(Boolean).length,percent=Math.round(done/31*100),streak=habitStreak(habit.days);return `<div class="habit-card compact-habit-card"><div class="habit-card-top"><div><h3>${escapeHTML(habit.name)}</h3><p>目标：${escapeHTML(habit.target)}</p></div><button class="habit-more" data-habit-menu="${index}">⋮</button></div><div class="compact-habit-stats"><span>完成 <b>${done}/31天</b></span><span>连续 <b>${streak}天</b></span></div><div class="habit-progress"><i style="width:${percent}%"></i></div><div class="habit-progress-label"><span>${percent}%</span><button class="habit-view" data-habit-view="${index}">查看详情 →</button></div></div>`}
habitCard = compactHabitCard;
const denseHabitUpgrade = upgradeHabitModule;
upgradeHabitModule = function(){denseHabitUpgrade();document.querySelectorAll('[data-habit-view]').forEach(button=>button.onclick=event=>{event.stopPropagation();showHabitDetail(Number(button.dataset.habitView))});};
function insertHomeGoals(){
  const page=document.querySelector('.page'),travelSection=page?.querySelector('.section');
  if(!page||!travelSection||page.querySelector('.home-goals-section'))return;
  const goals=[['英语提升','可以自然交流','0%'],['学习吉他','学会5首喜欢的歌','0%'],['独居基金','存下¥50,000','0%']];
  const section=document.createElement('section');section.className='section home-goals-section';section.innerHTML=`<div class="section-title"><h2>我的目标</h2><a data-page-link="goals">查看全部 →</a></div><div class="grid home-goals-grid">${goals.map(goal=>`<div class="card home-goal-card"><div class="home-goal-top"><span class="pill">长期目标</span><b>${goal[2]}</b></div><h3>${goal[0]}</h3><p>${goal[1]}</p><div class="goal-progress"><i style="width:0%"></i></div></div>`).join('')}</div>`;
  travelSection.before(section);section.querySelector('[data-page-link="goals"]').onclick=()=>navigate('goals');
}
const denseHomeLayout = home;
home = function(){denseHomeLayout();insertHomeGoals();};
home();
function formatTodayGreeting(){const now=new Date(),weekday=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][now.getDay()],month=['January','February','March','April','May','June','July','August','September','October','November','December'][now.getMonth()];return `${weekday.toUpperCase()} · ${month.toUpperCase()} ${now.getDate()}, ${now.getFullYear()}`}
function financeCompareRow(label,key){return `<div class="finance-compare-row"><span>${label}</span>${editableAmount(financeState[key],key,'finance-compare-input')}<small>上月记录</small></div>`}
function injectFinanceDetails(){
  const grid=document.querySelector('.module-grid');if(!grid)return;
  const cards=grid.querySelectorAll('.module-card');
  const keys=[['本月收入','lastIncome'],['本月支出','lastExpense'],['本月结余','lastBalance']];
  keys.forEach((item,index)=>{const card=cards[index];if(!card)return;card.querySelector('.finance-compare-row')?.remove();card.insertAdjacentHTML('beforeend',financeCompareRow(item[0],item[1]))});
  if(!grid.querySelector('.finance-savings-card')){grid.insertAdjacentHTML('beforeend',`<div class="card module-card finance-savings-card"><span class="pill">储蓄目标</span><h3>2026 独居基金</h3><p>已存金额与目标金额</p><div class="finance-savings-fields"><label>已存${editableAmount(financeState.saved,'saved','finance-compare-input')}</label><label>目标${editableAmount(financeState.target,'target','finance-compare-input')}</label></div><div class="goal-progress"><i style="width:${financeState.target?Math.min(100,financeState.saved/financeState.target*100):0}%"></i></div></div>`)}
  bindEditableFields();
}
const previousFinanceModulePage=modulePage;
modulePage=function(key){previousFinanceModulePage(key);if(key==='finance')injectFinanceDetails()};
function refineHomeOnly(){
  document.querySelector('.stats-grid')?.remove();
  document.querySelector('.home-goals-section')?.remove();
  const eyebrow=document.querySelector('.hero .eyebrow');if(eyebrow)eyebrow.textContent=formatTodayGreeting();
  const title=document.querySelector('.hero h1');if(title)title.innerHTML='喵~我在路上 <em>☀️</em>';
  document.querySelectorAll('.stats-grid .comparison-trend').forEach(node=>node.remove());
}
const previousHomeForContent=home;
home=function(){previousHomeForContent();refineHomeOnly()};
home();
const previousRefineHomeOnly=refineHomeOnly;
refineHomeOnly=function(){previousRefineHomeOnly();const title=document.querySelector('.hero h1');if(title)title.innerHTML='\u55b5~\u6211\u5728\u8def\u4e0a <em>\u2600\ufe0f</em>'};
const latestHomeRefresh=home;
home=function(){latestHomeRefresh();refineHomeOnly()};
home();
function renderEditableExpenseDetail(){
  document.querySelector('#pageLabel').textContent='支出分类';
  app.innerHTML=`<div class="page detail-page"><div class="page-heading"><div><button class="back-link" id="backExpenseHome">← 返回首页</button><h1>本月支出</h1><p>记录每一笔真实发生的消费。</p></div><button class="primary-btn" id="addExpense">＋ 添加第一笔支出</button></div><div class="card expense-detail-card">${expenseRecords.length?expenseRecords.map((item,index)=>`<div class="record-row editable-expense-row"><span class="record-icon">¥</span><div class="editable-expense-main"><select class="expense-edit-category" data-expense-index="${index}">${expenseCategories.map(category=>`<option ${category===item.category?'selected':''}>${category}</option>`).join('')}</select><small>${escapeHTML(item.date||TODAY_PLAN_DATE)}</small></div><label class="expense-edit-amount"><span>¥</span><input type="number" min="0" step="0.01" value="${numberValue(item.amount)}" data-expense-index="${index}"></label></div>`).join(''):'<div class="empty-state"><strong>本月暂无消费记录</strong><span>开始记录你的第一笔支出吧。</span></div>'}</div></div>`;
  document.querySelector('#backExpenseHome').onclick=()=>home();
  document.querySelector('#addExpense').onclick=expenseModal;
  document.querySelectorAll('[data-expense-index].expense-edit-category').forEach(input=>input.onchange=event=>{const index=Number(event.currentTarget.dataset.expenseIndex);expenseRecords[index].category=event.currentTarget.value;saveExpenses();syncExpenseTotals();home();toast('支出分类已更新')});
  document.querySelectorAll('.expense-edit-amount').forEach(label=>{const input=label.querySelector('input');input.onchange=event=>{const index=Number(event.currentTarget.dataset.expenseIndex);expenseRecords[index].amount=numberValue(event.currentTarget.value);saveExpenses();syncExpenseTotals();home();toast('支出金额已更新')}});
}
showExpenseDetail=renderEditableExpenseDetail;
function syncYearCard(){
  const card=document.querySelector('.year-card');if(!card)return;
  const today=new Date();today.setHours(0,0,0,0);
  const year=today.getFullYear();
  const nextYear=new Date(year+1,0,1);
  const start=new Date(year,0,1);
  const daysInYear=Math.round((nextYear-start)/86400000);
  const remainingDays=Math.max(0,Math.ceil((nextYear-today)/86400000));
  const remainingPercent=Math.round(remainingDays/daysInYear*100);
  const labels=card.querySelectorAll('.label span');
  if(labels[0])labels[0].textContent=`${year} 年剩余时间`;
  if(labels[1])labels[1].textContent=`${remainingPercent}%`;
  const strong=card.querySelector('strong');if(strong)strong.textContent=`还有 ${remainingDays} 天`;
  const progress=card.querySelector('.year-progress i');if(progress)progress.style.width=`${remainingPercent}%`;
}
const homeWithLiveYear=home;
home=function(){homeWithLiveYear();syncYearCard()};
home();
let customExpenseCategories=JSON.parse(localStorage.getItem('life-assistant-expense-categories')||'[]');
customExpenseCategories.filter(Boolean).forEach(category=>{if(!expenseCategories.includes(category))expenseCategories.push(category)});
function saveCustomExpenseCategories(){localStorage.setItem('life-assistant-expense-categories',JSON.stringify(customExpenseCategories))}
expenseModal=function(){
  document.querySelector('.expense-modal')?.remove();
  const modal=document.createElement('div');modal.className='expense-modal task-modal';
  modal.innerHTML=`<div class="task-modal-backdrop"></div><form class="task-modal-card"><div class="task-modal-header"><div><span class="eyebrow">EXPENSE</span><h3>添加支出</h3></div><button type="button" class="modal-close">×</button></div><label>金额<input name="amount" type="number" min="0" step="0.01" placeholder="0" required></label><label>分类<select name="category">${expenseCategories.map(category=>`<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join('')}<option value="__custom__">＋ 自定义分类</option></select></label><label class="custom-category-field" hidden>自定义分类名称<input name="customCategory" type="text" placeholder="例如：宠物 / 医疗 / 咖啡"></label><div class="task-modal-actions"><button type="button" class="modal-cancel">取消</button><button type="submit" class="primary-btn">保存支出</button></div></form>`;
  document.body.appendChild(modal);const form=modal.querySelector('form'),categorySelect=form.querySelector('[name="category"]'),customField=form.querySelector('.custom-category-field');
  const close=()=>modal.remove();modal.querySelector('.modal-close').onclick=close;modal.querySelector('.modal-cancel').onclick=close;modal.querySelector('.task-modal-backdrop').onclick=close;
  categorySelect.onchange=()=>{customField.hidden=categorySelect.value!=='__custom__';if(!customField.hidden)customField.querySelector('input').focus()};
  form.onsubmit=event=>{event.preventDefault();const data=new FormData(form);let category=String(data.get('category'));if(category==='__custom__'){category=String(data.get('customCategory')||'').trim();if(!category){customField.querySelector('input').focus();return}if(!expenseCategories.includes(category)){expenseCategories.push(category);customExpenseCategories.push(category);saveCustomExpenseCategories()}}const amount=numberValue(data.get('amount'));expenseRecords.push({amount,category,date:TODAY_PLAN_DATE});syncExpenseTotals();saveExpenses();close();home();toast('支出已保存')};
  form.querySelector('[name="amount"]').focus();
};
let customTaskCategories=JSON.parse(localStorage.getItem('life-assistant-task-categories')||'[]');
customTaskCategories.filter(Boolean).forEach(category=>{if(!taskCategories.includes(category))taskCategories.push(category)});
function saveCustomTaskCategories(){localStorage.setItem('life-assistant-task-categories',JSON.stringify(customTaskCategories))}
taskModal=function(index=null,date=activePlanDate){
  document.querySelector('.task-modal')?.remove();const actual=index===null?null:index;const item=actual===null?{text:'',time:'学习',reminder:false}:{...tasks[actual]};const modal=document.createElement('div');modal.className='task-modal';
  modal.innerHTML=`<div class="task-modal-backdrop"></div><form class="task-modal-card"><div class="task-modal-header"><div><span class="eyebrow">TODAY PLAN</span><h3>${actual===null?'添加一项计划':'编辑计划'}</h3></div><button type="button" class="modal-close">×</button></div><label>计划名称<input name="name" value="${escapeHTML(item.text)}" placeholder="例如：英语学习30分钟" required></label><label>分类<select name="category">${taskCategories.map(category=>`<option value="${escapeHTML(category)}" ${item.time===category?'selected':''}>${escapeHTML(category)}</option>`).join('')}<option value="__custom__">＋ 自定义分类</option></select></label><label class="custom-task-category-field" hidden>自定义分类名称<input name="customCategory" type="text" placeholder="例如：宠物 / 家务 / 社交"></label><label class="reminder-option"><input type="checkbox" name="reminder" ${item.reminder?'checked':''}> 设置提醒（功能预留）</label><div class="task-modal-actions"><button type="button" class="modal-cancel">取消</button><button type="submit" class="primary-btn">保存计划</button></div></form>`;
  document.body.appendChild(modal);const form=modal.querySelector('form'),categorySelect=form.querySelector('[name="category"]'),customField=form.querySelector('.custom-task-category-field');const close=()=>modal.remove();modal.querySelector('.modal-close').onclick=close;modal.querySelector('.modal-cancel').onclick=close;modal.querySelector('.task-modal-backdrop').onclick=close;categorySelect.onchange=()=>{customField.hidden=categorySelect.value!=='__custom__';if(!customField.hidden)customField.querySelector('input').focus()};
  form.onsubmit=event=>{event.preventDefault();const data=new FormData(form);let category=String(data.get('category'));if(category==='__custom__'){category=String(data.get('customCategory')||'').trim();if(!category){customField.querySelector('input').focus();return}if(!taskCategories.includes(category)){taskCategories.push(category);customTaskCategories.push(category);saveCustomTaskCategories()}}const next={...(actual===null?{done:false}:{...tasks[actual]}),text:String(data.get('name')).trim(),time:category,reminder:data.get('reminder')==='on',date};if(actual===null)tasks.push(next);else tasks[actual]=next;saveTasks();close();date===TODAY_PLAN_DATE?home():showTaskDetail(date);toast('计划已保存')};form.querySelector('[name="name"]').focus();
};
const originalHabitDetailPage=showHabitDetail;
function habitEditModal(index){
  const habit=habitState[index];document.querySelector('.habit-edit-modal')?.remove();const modal=document.createElement('div');modal.className='habit-edit-modal task-modal';
  modal.innerHTML=`<div class="task-modal-backdrop"></div><form class="task-modal-card"><div class="task-modal-header"><div><span class="eyebrow">HABIT TRACKER</span><h3>编辑习惯</h3></div><button type="button" class="modal-close">×</button></div><label>习惯名称<input name="name" value="${escapeHTML(habit.name)}" required></label><label>目标内容<input name="target" value="${escapeHTML(habit.target)}" placeholder="例如：每天学习30分钟" required></label><div class="task-modal-actions"><button type="button" class="modal-cancel">取消</button><button type="submit" class="primary-btn">保存修改</button></div></form>`;
  document.body.appendChild(modal);const close=()=>modal.remove();modal.querySelector('.modal-close').onclick=close;modal.querySelector('.modal-cancel').onclick=close;modal.querySelector('.task-modal-backdrop').onclick=close;modal.querySelector('form').onsubmit=event=>{event.preventDefault();const data=new FormData(event.currentTarget);habit.name=String(data.get('name')).trim();habit.target=String(data.get('target')).trim();saveHabits();close();showHabitDetail(index);toast('习惯已更新')};modal.querySelector('[name="name"]').focus();
}
showHabitDetail=function(index){originalHabitDetailPage(index);const heading=document.querySelector('.detail-page .page-heading');if(!heading)return;const title=heading.querySelector('h1'),target=heading.querySelector('p');const edit=document.createElement('button');edit.className='habit-edit-button';edit.type='button';edit.textContent='编辑习惯';edit.onclick=()=>habitEditModal(index);heading.appendChild(edit);if(title)title.onclick=()=>habitEditModal(index);if(target)target.onclick=()=>habitEditModal(index)};
let travelPlaces=JSON.parse(localStorage.getItem('life-assistant-travel-places')||'null');
if(!Array.isArray(travelPlaces)||!travelPlaces.length){travelPlaces=[{name:'青海',icon:'🏔',status:'计划中',budget:numberValue(travelState.qinghaiBudget),year:travelState.qinghaiYear||'',note:'想看：青海湖 · 茶卡盐湖',image:travelState.qinghaiImage||''},{name:'云南',icon:'🌿',status:'想去',budget:numberValue(travelState.yunnanBudget),year:travelState.yunnanYear||'',note:'想体验：慢生活 · 小城散步',image:travelState.yunnanImage||''}];localStorage.setItem('life-assistant-travel-places',JSON.stringify(travelPlaces))}
function saveTravelPlaces(){localStorage.setItem('life-assistant-travel-places',JSON.stringify(travelPlaces))}
function travelPlaceCard(place,index){return `<div class="card travel-card"><div class="travel-visual ${place.image?'has-custom-image':''}" ${place.image?`style="background-image:url('${escapeHTML(place.image)}')"`:''}></div><div class="travel-info"><h3>${escapeHTML(place.icon||'📍')} ${escapeHTML(place.name)}</h3><select class="travel-status-edit" data-travel-place="${index}"><option ${place.status==='计划中'?'selected':''}>计划中</option><option ${place.status==='想去'?'selected':''}>想去</option><option ${place.status==='已去过'?'selected':''}>已去过</option></select><p>预算：<input class="travel-place-input" type="number" min="0" step="0.01" value="${numberValue(place.budget)}" data-travel-place="${index}" data-field="budget"></p><p>计划时间：<input class="travel-place-input" type="number" min="2026" max="2100" value="${escapeHTML(place.year||'')}" placeholder="未设置" data-travel-place="${index}" data-field="year"></p><p>${escapeHTML(place.note||'')}</p></div></div>`}
function travelAddModal(){document.querySelector('.travel-add-modal')?.remove();const modal=document.createElement('div');modal.className='travel-add-modal task-modal';modal.innerHTML=`<div class="task-modal-backdrop"></div><form class="task-modal-card"><div class="task-modal-header"><div><span class="eyebrow">TRAVEL LIST</span><h3>添加一个地方</h3></div><button type="button" class="modal-close">×</button></div><label>地点名称<input name="name" placeholder="例如：京都" required></label><label>状态<select name="status"><option>计划中</option><option>想去</option><option>已去过</option></select></label><label>预算<input name="budget" type="number" min="0" step="0.01" placeholder="0"></label><label>计划时间<input name="year" type="number" min="2026" max="2100" placeholder="例如：2027"></label><label>备注<input name="note" placeholder="例如：想体验当地的慢生活"></label><label>图片地址（可选）<input name="image" placeholder="粘贴图片地址"></label><div class="task-modal-actions"><button type="button" class="modal-cancel">取消</button><button type="submit" class="primary-btn">保存地点</button></div></form>`;document.body.appendChild(modal);const close=()=>modal.remove();modal.querySelector('.modal-close').onclick=close;modal.querySelector('.modal-cancel').onclick=close;modal.querySelector('.task-modal-backdrop').onclick=close;modal.querySelector('form').onsubmit=event=>{event.preventDefault();const data=new FormData(event.currentTarget);travelPlaces.push({name:String(data.get('name')).trim(),icon:'📍',status:String(data.get('status')),budget:numberValue(data.get('budget')),year:String(data.get('year')||''),note:String(data.get('note')||'').trim(),image:String(data.get('image')||'').trim()});saveTravelPlaces();close();travel();toast('地点已添加')};modal.querySelector('[name="name"]').focus()}
function bindTravelPlaces(){document.querySelectorAll('[data-travel-place]').forEach(input=>input.onchange=event=>{const index=Number(event.currentTarget.dataset.travelPlace),field=event.currentTarget.dataset.field;if(field)travelPlaces[index][field]=field==='budget'?numberValue(event.currentTarget.value):event.currentTarget.value;else travelPlaces[index].status=event.currentTarget.value;saveTravelPlaces();travel();toast('旅行计划已更新')});document.querySelectorAll('.travel-visual').forEach((node,index)=>node.onclick=()=>{const url=prompt('请输入图片地址（留空恢复默认插图）',travelPlaces[index].image||'');if(url!==null){travelPlaces[index].image=url.trim();saveTravelPlaces();travel();toast('旅行图片已保存')}})}
travel=function(){shell('我的旅行',`<div class="page-heading"><div><h1>我的旅行</h1><p>去见山河，也去见更开阔的自己。</p></div><button class="primary-btn" id="addTravelPlace">＋ 添加地方</button></div><div class="grid travel-grid travel-place-grid">${travelPlaces.map(travelPlaceCard).join('')}</div>`);document.querySelector('#addTravelPlace').onclick=travelAddModal;bindTravelPlaces()};
const previousTravelBinding=bindTravelPlaces;
bindTravelPlaces=function(){previousTravelBinding();document.querySelectorAll('.travel-visual').forEach((node,index)=>{node.dataset.imageLabel=travelPlaces[index]?.image?'点击更换图片':'点击编辑图片'})};
let learningRecords=JSON.parse(localStorage.getItem('life-assistant-learning-records')||'null');
if(!Array.isArray(learningRecords)||!learningRecords.length){learningRecords=[{tag:'记录',title:'英语',content:'今日学习30分钟'},{tag:'记录',title:'产品设计',content:'本周学习2小时'},{tag:'记录',title:'阅读',content:'《山茶文具店》'}];localStorage.setItem('life-assistant-learning-records',JSON.stringify(learningRecords))}
function saveLearningRecords(){localStorage.setItem('life-assistant-learning-records',JSON.stringify(learningRecords))}
function learningRecordModal(index=null){document.querySelector('.learning-record-modal')?.remove();const item=index===null?{tag:'记录',title:'',content:''}:learningRecords[index];const modal=document.createElement('div');modal.className='learning-record-modal task-modal';modal.innerHTML=`<div class="task-modal-backdrop"></div><form class="task-modal-card"><div class="task-modal-header"><div><span class="eyebrow">LEARNING NOTE</span><h3>${index===null?'新建记录':'编辑记录'}</h3></div><button type="button" class="modal-close">×</button></div><label>标签<input name="tag" value="${escapeHTML(item.tag)}" placeholder="例如：记录 / 课程 / 阅读"></label><label>记录名称<input name="title" value="${escapeHTML(item.title)}" placeholder="例如：英语" required></label><label>学习内容<input name="content" value="${escapeHTML(item.content)}" placeholder="例如：今日学习30分钟" required></label><div class="task-modal-actions"><button type="button" class="modal-cancel">取消</button><button type="submit" class="primary-btn">保存记录</button></div></form>`;document.body.appendChild(modal);const close=()=>modal.remove();modal.querySelector('.modal-close').onclick=close;modal.querySelector('.modal-cancel').onclick=close;modal.querySelector('.task-modal-backdrop').onclick=close;modal.querySelector('form').onsubmit=event=>{event.preventDefault();const data=new FormData(event.currentTarget);const next={tag:String(data.get('tag')||'记录').trim()||'记录',title:String(data.get('title')).trim(),content:String(data.get('content')).trim()};if(index===null)learningRecords.push(next);else learningRecords[index]=next;saveLearningRecords();close();modulePage('learning');toast('学习记录已保存')};modal.querySelector('[name="title"]').focus()}
function renderLearningPage(){shell('我的学习',`<div class="page-heading"><div><h1>我的学习</h1><p>持续输入，也记得给自己一点成就感。</p></div><button class="primary-btn" id="addLearningRecord">＋ 新建记录</button></div><div class="grid module-grid learning-record-grid">${learningRecords.map((item,index)=>`<div class="card module-card learning-record-card"><button class="learning-edit-button" data-learning-edit="${index}" type="button">编辑</button><span class="pill">${escapeHTML(item.tag)}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.content)}</p></div>`).join('')}</div>`);document.querySelector('#addLearningRecord').onclick=()=>learningRecordModal();document.querySelectorAll('[data-learning-edit]').forEach(button=>button.onclick=()=>learningRecordModal(Number(button.dataset.learningEdit)));document.querySelectorAll('.learning-record-card').forEach((card,index)=>card.onclick=event=>{if(!event.target.closest('button'))learningRecordModal(index)})}
const previousModulePageForLearning=modulePage;
modulePage=function(key){if(key==='learning'){renderLearningPage();return}previousModulePageForLearning(key)};
let interestRecords=JSON.parse(localStorage.getItem('life-assistant-interest-records')||'null');
if(!Array.isArray(interestRecords)||!interestRecords.length){interestRecords=[{tag:'记录',title:'♬ 吉他',content:'正在练习《晴天》'},{tag:'记录',title:'◉ 摄影',content:'记录城市里的小风景'},{tag:'记录',title:'✦ 新尝试',content:'想学做一杯手冲咖啡'}];localStorage.setItem('life-assistant-interest-records',JSON.stringify(interestRecords))}
function saveInterestRecords(){localStorage.setItem('life-assistant-interest-records',JSON.stringify(interestRecords))}
function interestRecordModal(index=null){document.querySelector('.interest-record-modal')?.remove();const item=index===null?{tag:'记录',title:'',content:''}:interestRecords[index];const modal=document.createElement('div');modal.className='interest-record-modal task-modal';modal.innerHTML=`<div class="task-modal-backdrop"></div><form class="task-modal-card"><div class="task-modal-header"><div><span class="eyebrow">PERSONAL INTEREST</span><h3>${index===null?'新建记录':'编辑记录'}</h3></div><button type="button" class="modal-close">×</button></div><label>标签<input name="tag" value="${escapeHTML(item.tag)}" placeholder="例如：记录 / 兴趣 / 灵感"></label><label>记录名称<input name="title" value="${escapeHTML(item.title)}" placeholder="例如：♬ 吉他" required></label><label>兴趣内容<input name="content" value="${escapeHTML(item.content)}" placeholder="例如：正在练习《晴天》" required></label><div class="task-modal-actions"><button type="button" class="modal-cancel">取消</button><button type="submit" class="primary-btn">保存记录</button></div></form></div>`;document.body.appendChild(modal);const close=()=>modal.remove();modal.querySelector('.modal-close').onclick=close;modal.querySelector('.modal-cancel').onclick=close;modal.querySelector('.task-modal-backdrop').onclick=close;modal.querySelector('form').onsubmit=event=>{event.preventDefault();const data=new FormData(event.currentTarget);const next={tag:String(data.get('tag')||'记录').trim()||'记录',title:String(data.get('title')).trim(),content:String(data.get('content')).trim()};if(index===null)interestRecords.push(next);else interestRecords[index]=next;saveInterestRecords();close();modulePage('interests');toast('兴趣记录已保存')};modal.querySelector('[name="title"]').focus()}
function renderInterestPage(){shell('我的兴趣',`<div class="page-heading"><div><h1>我的兴趣</h1><p>兴趣不是任务，是让生活发光的方式。</p></div><button class="primary-btn" id="addInterestRecord">＋ 新建记录</button></div><div class="grid module-grid interest-record-grid">${interestRecords.map((item,index)=>`<div class="card module-card interest-record-card"><button class="learning-edit-button" data-interest-edit="${index}" type="button">编辑</button><span class="pill">${escapeHTML(item.tag)}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.content)}</p></div>`).join('')}</div>`);document.querySelector('#addInterestRecord').onclick=()=>interestRecordModal();document.querySelectorAll('[data-interest-edit]').forEach(button=>button.onclick=()=>interestRecordModal(Number(button.dataset.interestEdit)));document.querySelectorAll('.interest-record-card').forEach((card,index)=>card.onclick=event=>{if(!event.target.closest('button'))interestRecordModal(index)})}
const previousModulePageForInterests=modulePage;
modulePage=function(key){if(key==='interests'){renderInterestPage();return}previousModulePageForInterests(key)};
let futureRecords=JSON.parse(localStorage.getItem('life-assistant-future-records')||'null');
if(!Array.isArray(futureRecords)||!futureRecords.length){futureRecords=[{tag:'记录',title:'想拥有的生活',content:'有一间采光很好的小屋，窗边有植物和书。'},{tag:'记录',title:'想开的店',content:'一家安静的咖啡与花店，欢迎每个疲惫的人。'},{tag:'记录',title:'想成为的人',content:'温柔、坚定、拥有选择自己生活的能力。'}];localStorage.setItem('life-assistant-future-records',JSON.stringify(futureRecords))}
function saveFutureRecords(){localStorage.setItem('life-assistant-future-records',JSON.stringify(futureRecords))}
function futureRecordModal(index=null){document.querySelector('.future-record-modal')?.remove();const item=index===null?{tag:'记录',title:'',content:''}:futureRecords[index];const modal=document.createElement('div');modal.className='future-record-modal task-modal';modal.innerHTML=`<div class="task-modal-backdrop"></div><form class="task-modal-card"><div class="task-modal-header"><div><span class="eyebrow">FUTURE NOTE</span><h3>${index===null?'新建记录':'编辑记录'}</h3></div><button type="button" class="modal-close">×</button></div><label>标签<input name="tag" value="${escapeHTML(item.tag)}" placeholder="例如：记录 / 梦想 / 规划"></label><label>记录名称<input name="title" value="${escapeHTML(item.title)}" placeholder="例如：想拥有的生活" required></label><label>未来内容<textarea name="content" placeholder="写下你想要的未来" required>${escapeHTML(item.content)}</textarea></label><div class="task-modal-actions"><button type="button" class="modal-cancel">取消</button><button type="submit" class="primary-btn">保存记录</button></div></form>`;document.body.appendChild(modal);const close=()=>modal.remove();modal.querySelector('.modal-close').onclick=close;modal.querySelector('.modal-cancel').onclick=close;modal.querySelector('.task-modal-backdrop').onclick=close;modal.querySelector('form').onsubmit=event=>{event.preventDefault();const data=new FormData(event.currentTarget);const next={tag:String(data.get('tag')||'记录').trim()||'记录',title:String(data.get('title')).trim(),content:String(data.get('content')).trim()};if(index===null)futureRecords.push(next);else futureRecords[index]=next;saveFutureRecords();close();modulePage('future');toast('未来记录已保存')};modal.querySelector('[name="title"]').focus()}
function renderFuturePage(){shell('我的未来',`<div class="page-heading"><div><h1>我的未来</h1><p>写下想拥有的生活，未来会慢慢回应你。</p></div><button class="primary-btn" id="addFutureRecord">＋ 新建记录</button></div><div class="grid module-grid future-record-grid">${futureRecords.map((item,index)=>`<div class="card module-card future-record-card"><button class="learning-edit-button" data-future-edit="${index}" type="button">编辑</button><span class="pill">${escapeHTML(item.tag)}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.content)}</p></div>`).join('')}</div>`);document.querySelector('#addFutureRecord').onclick=()=>futureRecordModal();document.querySelectorAll('[data-future-edit]').forEach(button=>button.onclick=()=>futureRecordModal(Number(button.dataset.futureEdit)));document.querySelectorAll('.future-record-card').forEach((card,index)=>card.onclick=event=>{if(!event.target.closest('button'))futureRecordModal(index)})}
const previousModulePageForFuture=modulePage;
modulePage=function(key){if(key==='future'){renderFuturePage();return}previousModulePageForFuture(key)};
let favoriteRecords=JSON.parse(localStorage.getItem('life-assistant-favorite-records')||'null');
if(!Array.isArray(favoriteRecords)||!favoriteRecords.length){favoriteRecords=[{image:'',name:'未来房间',category:'空间灵感',price:0,date:'',status:'想拥有',reason:'自然光、木质家具、窗边的一盆绿植。'},{image:'',name:'喜欢的咖啡店',category:'生活体验',price:0,date:'',status:'想拥有',reason:'下次想去坐一下午，写一封信。'},{image:'',name:'饮品店装修灵感',category:'设计灵感',price:0,date:'',status:'想拥有',reason:'低饱和色、手写菜单和一束小花。'}];localStorage.setItem('life-assistant-favorite-records',JSON.stringify(favoriteRecords))}
function saveFavoriteRecords(){localStorage.setItem('life-assistant-favorite-records',JSON.stringify(favoriteRecords))}
function favoriteModal(index=null){document.querySelector('.favorite-modal')?.remove();const item=index===null?{image:'',name:'',category:'',price:0,date:'',status:'想拥有',reason:''}:favoriteRecords[index];const modal=document.createElement('div');modal.className='favorite-modal task-modal';modal.innerHTML=`<div class="task-modal-backdrop"></div><form class="task-modal-card"><div class="task-modal-header"><div><span class="eyebrow">MY FAVORITE</span><h3>${index===null?'添加喜欢的东西':'编辑喜欢的东西'}</h3></div><button type="button" class="modal-close">×</button></div><label>图片地址<input name="image" value="${escapeHTML(item.image)}" placeholder="粘贴图片地址（可选）"></label><label>名称<input name="name" value="${escapeHTML(item.name)}" placeholder="例如：一把喜欢的椅子" required></label><label>分类<input name="category" value="${escapeHTML(item.category)}" placeholder="例如：家居 / 书籍 / 生活方式" required></label><label>价格<input name="price" type="number" min="0" step="0.01" value="${numberValue(item.price)}"></label><label>购买日期<input name="date" type="date" value="${escapeHTML(item.date)}"></label><label>当前状态<select name="status"><option ${item.status==='想拥有'?'selected':''}>想拥有</option><option ${item.status==='已拥有'?'selected':''}>已拥有</option></select></label><label>为什么喜欢<textarea name="reason" placeholder="记录喜欢它的原因和生活想象" required>${escapeHTML(item.reason)}</textarea></label><div class="task-modal-actions"><button type="button" class="modal-cancel">取消</button><button type="submit" class="primary-btn">保存</button></div></form>`;document.body.appendChild(modal);const close=()=>modal.remove();modal.querySelector('.modal-close').onclick=close;modal.querySelector('.modal-cancel').onclick=close;modal.querySelector('.task-modal-backdrop').onclick=close;modal.querySelector('form').onsubmit=event=>{event.preventDefault();const data=new FormData(event.currentTarget);const next={image:String(data.get('image')||'').trim(),name:String(data.get('name')).trim(),category:String(data.get('category')).trim(),price:numberValue(data.get('price')),date:String(data.get('date')||''),status:String(data.get('status')),reason:String(data.get('reason')).trim()};if(index===null)favoriteRecords.push(next);else favoriteRecords[index]=next;saveFavoriteRecords();close();modulePage('collection');toast('喜欢已保存')};modal.querySelector('[name="name"]').focus()}
function renderFavoritesPage(){pages.collection='我的喜欢';shell('我的喜欢',`<div class="page-heading"><div><h1>我的喜欢</h1><p>记录我认真选择过、喜欢过、拥有过的生活碎片。</p></div><button class="primary-btn" id="addFavorite">＋ 添加喜欢</button></div><div class="grid collection-grid">${favoriteRecords.map((item,index)=>`<div class="card favorite-card"><div class="favorite-image ${item.image?'has-custom-image':''}" ${item.image?`style="background-image:url('${escapeHTML(item.image)}')"`:''}></div><div class="favorite-body"><button class="learning-edit-button" data-favorite-edit="${index}" type="button">编辑</button><span class="pill">${escapeHTML(item.category)}</span><h3>${escapeHTML(item.name)}</h3><div class="favorite-meta"><span>¥${numberValue(item.price).toFixed(2)}</span><span>${item.status==='已拥有'?'已拥有':'想拥有'}</span></div>${item.date?`<small>购买日期：${escapeHTML(item.date)}</small>`:''}<p>${escapeHTML(item.reason)}</p></div></div>`).join('')}</div>`);document.querySelector('#addFavorite').onclick=()=>favoriteModal();document.querySelectorAll('[data-favorite-edit]').forEach(button=>button.onclick=()=>favoriteModal(Number(button.dataset.favoriteEdit)));document.querySelectorAll('.favorite-card').forEach((card,index)=>card.onclick=event=>{if(!event.target.closest('button'))favoriteModal(index)})}
const previousModulePageForFavorites=modulePage;
modulePage=function(key){if(key==='collection'){renderFavoritesPage();return}previousModulePageForFavorites(key)};
let hiddenFinanceCards=JSON.parse(localStorage.getItem('life-assistant-hidden-finance-cards')||'[]');
function bindFinanceDeleteButtons(){const grid=document.querySelector('.module-grid');if(!grid)return;const cards=[...grid.querySelectorAll('.module-card')];const keys=['income','expense','balance','savings'];cards.forEach((card,index)=>{const key=keys[index];if(!key)return;card.querySelector('.finance-delete-button')?.remove();const button=document.createElement('button');button.type='button';button.className='finance-delete-button';button.textContent='×';button.setAttribute('aria-label','删除此财务卡片');button.onclick=event=>{event.stopPropagation();if(!hiddenFinanceCards.includes(key))hiddenFinanceCards.push(key);localStorage.setItem('life-assistant-hidden-finance-cards',JSON.stringify(hiddenFinanceCards));modulePage('finance');toast('卡片已删除')};card.appendChild(button);if(hiddenFinanceCards.includes(key))card.hidden=true})}
const previousModulePageForFinanceDelete=modulePage;
modulePage=function(key){previousModulePageForFinanceDelete(key);if(key==='finance')bindFinanceDeleteButtons()};

let hiddenGoalCards=JSON.parse(localStorage.getItem('life-assistant-hidden-goal-cards')||'[]');
function bindGoalDeleteButtons(){
  const grid=document.querySelector('.module-grid');
  if(!grid)return;
  [...grid.querySelectorAll('.module-card')].forEach((card,index)=>{
    card.querySelector('.goal-delete-button')?.remove();
    const button=document.createElement('button');
    button.type='button';
    button.className='goal-delete-button';
    button.textContent='🗑';
    button.setAttribute('aria-label','删除此目标');
    button.onclick=event=>{
      event.stopPropagation();
      if(!hiddenGoalCards.includes(index))hiddenGoalCards.push(index);
      localStorage.setItem('life-assistant-hidden-goal-cards',JSON.stringify(hiddenGoalCards));
      modulePage('goals');
      toast('目标已删除');
    };
    card.appendChild(button);
    if(hiddenGoalCards.includes(index))card.hidden=true;
  });
}
const previousModulePageForGoalDelete=modulePage;
modulePage=function(key){previousModulePageForGoalDelete(key);if(key==='goals')bindGoalDeleteButtons()};

function bindFavoriteDeleteButtons(){
  const grid=document.querySelector('.favorite-grid-v2');
  if(!grid)return;
  const addButtons=()=>grid.querySelectorAll('.favorite-card').forEach(card=>{
    if(card.querySelector('.favorite-delete-button'))return;
    const index=Number(card.querySelector('[data-favorite-edit]')?.dataset.favoriteEdit);
    if(!Number.isInteger(index))return;
    const button=document.createElement('button');
    button.type='button';button.className='favorite-delete-button';button.textContent='🗑';button.setAttribute('aria-label','删除喜欢记录');
    button.onclick=event=>{
      event.stopPropagation();
      if(!confirm('确定删除这条喜欢记录吗？'))return;
      favoriteRecords.splice(index,1);saveFavoriteRecords();modulePage('collection');toast('喜欢记录已删除');
    };
    card.querySelector('.favorite-body')?.appendChild(button);
  });
  addButtons();
  grid._favoriteDeleteObserver?.disconnect();
  grid._favoriteDeleteObserver=new MutationObserver(addButtons);
  grid._favoriteDeleteObserver.observe(grid,{childList:true,subtree:true});
}
const previousFavoritesRenderer=renderFavoritesPage;
renderFavoritesPage=function(){previousFavoritesRenderer();bindFavoriteDeleteButtons()};

function renderFavoritesPage(){
  pages.collection='我的喜欢';
  const owned=favoriteRecords.filter(item=>item.status==='已拥有').length;
  const wanted=favoriteRecords.filter(item=>item.status!=='已拥有').length;
  const categories=[...new Set(favoriteRecords.map(item=>item.category).filter(Boolean))];
  const renderCards=(filter='全部',sort='最新添加')=>{
    let list=favoriteRecords.map((item,index)=>({...item,index}));
    if(filter==='已拥有')list=list.filter(item=>item.status==='已拥有');
    if(filter==='想拥有')list=list.filter(item=>item.status!=='已拥有');
    if(filter!=='全部'&&filter!=='已拥有'&&filter!=='想拥有')list=list.filter(item=>item.category===filter);
    if(sort==='价格从高到低')list.sort((a,b)=>numberValue(b.price)-numberValue(a.price));
    if(sort==='价格从低到高')list.sort((a,b)=>numberValue(a.price)-numberValue(b.price));
    return list.length?list.map(item=>`<div class="card favorite-card favorite-card-v2"><div class="favorite-image ${item.image?'has-custom-image':''}" ${item.image?`style="background-image:url('${escapeHTML(item.image)}')"`:''}><span class="favorite-image-mark">${item.status==='已拥有'?'★':'♡'}</span></div><div class="favorite-body"><div class="favorite-card-line"><span class="pill">${escapeHTML(item.category||'生活')}</span><button class="favorite-menu-button" data-favorite-edit="${item.index}" type="button">•••</button></div><h3>${escapeHTML(item.name)}</h3><div class="favorite-meta"><span>¥ ${numberValue(item.price).toFixed(2)}</span><span>${item.status==='已拥有'?'已拥有':'想拥有'}</span></div>${item.date?`<small>▣ ${escapeHTML(item.date)} ${item.status==='已拥有'?'购买':'添加'}</small>`:''}<p>${escapeHTML(item.reason||'记录一件让生活变得更好的东西。')}</p></div></div>`).join(''):'<div class="favorite-empty">还没有符合条件的喜欢，添加一件让你心动的东西吧。</div>';
  };
  shell('我的喜欢',`<div class="page-heading favorite-heading"><div><h1>我的喜欢</h1><p>把认真喜欢过的东西留下，也记录生活一点点变好的过程。</p></div><button class="primary-btn" id="addFavorite">＋ 新增喜欢</button></div><div class="card favorite-summary"><div><span>▣</span><small>已拥有</small><strong>${owned}</strong><em>件</em></div><div><span>♥</span><small>想拥有</small><strong>${wanted}</strong><em>件</em></div><div><span>✦</span><small>本月新增</small><strong>${favoriteRecords.filter(item=>item.date&&item.date.slice(0,7)===TODAY_PLAN_DATE.slice(0,7)).length}</strong><em>件</em></div><blockquote>“喜欢，是生活给我们<br>最温柔的奖励。”</blockquote></div><div class="favorite-toolbar"><div class="favorite-filters"><button class="favorite-filter active" data-favorite-filter="全部">全部</button><button class="favorite-filter" data-favorite-filter="已拥有">已拥有</button><button class="favorite-filter" data-favorite-filter="想拥有">想拥有</button>${categories.map(category=>`<button class="favorite-filter" data-favorite-filter="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join('')}</div><select id="favoriteSort"><option>最新添加</option><option>价格从高到低</option><option>价格从低到高</option></select></div><div class="grid collection-grid favorite-grid-v2" id="favoriteGrid">${renderCards()}</div>`);
  const grid=document.querySelector('#favoriteGrid');
  let currentFilter='全部';
  document.querySelector('#addFavorite').onclick=()=>favoriteModal();
  document.querySelectorAll('[data-favorite-filter]').forEach(button=>button.onclick=()=>{currentFilter=button.dataset.favoriteFilter;document.querySelectorAll('.favorite-filter').forEach(node=>node.classList.toggle('active',node===button));grid.innerHTML=renderCards(currentFilter,document.querySelector('#favoriteSort').value);bindCards()});
  document.querySelector('#favoriteSort').onchange=event=>{grid.innerHTML=renderCards(currentFilter,event.currentTarget.value);bindCards()};
  function bindCards(){document.querySelectorAll('[data-favorite-edit]').forEach(button=>button.onclick=event=>{event.stopPropagation();favoriteModal(Number(button.dataset.favoriteEdit))});document.querySelectorAll('.favorite-card').forEach(card=>card.onclick=event=>{if(!event.target.closest('button'))favoriteModal(Number(card.querySelector('[data-favorite-edit]').dataset.favoriteEdit))})}
  bindCards();
}

function renderLearningPageWithDelete(){
  shell('我的学习',`<div class="page-heading"><div><h1>我的学习</h1><p>持续输入，也记得给自己一点成就感。</p></div><button class="primary-btn" id="addLearningRecord">＋ 新建记录</button></div><div class="grid module-grid learning-record-grid">${learningRecords.map((item,index)=>`<div class="card module-card learning-record-card"><div class="learning-card-actions"><button class="learning-edit-button" data-learning-edit="${index}" type="button">编辑</button><button class="learning-delete-button" data-learning-delete="${index}" type="button" aria-label="删除学习记录">♲</button></div><span class="pill">${escapeHTML(item.tag)}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.content)}</p></div>`).join('')}</div>`);
  document.querySelector('#addLearningRecord').onclick=()=>learningRecordModal();
  document.querySelectorAll('[data-learning-edit]').forEach(button=>button.onclick=()=>learningRecordModal(Number(button.dataset.learningEdit)));
  document.querySelectorAll('[data-learning-delete]').forEach(button=>button.onclick=event=>{
    event.stopPropagation();
    const index=Number(button.dataset.learningDelete);
    if(!confirm('确定删除这条学习记录吗？'))return;
    learningRecords.splice(index,1);saveLearningRecords();renderLearningPageWithDelete();toast('学习记录已删除');
  });
  document.querySelectorAll('.learning-record-card').forEach((card,index)=>card.onclick=event=>{if(!event.target.closest('button'))learningRecordModal(index)});
}
renderLearningPage=renderLearningPageWithDelete;

pages.recycle='回收站';
if(!navConfig.some(item=>item.id==='recycle')){
  navConfig=[...navConfig,{id:'recycle',icon:'▱'}];
  localStorage.setItem('life-assistant-nav',JSON.stringify(navConfig));
}
const recycleModuleNames={finance:'我的财务',goals:'我的目标',learning:'我的学习',travel:'我的旅行',interests:'我的兴趣',future:'我的未来',collection:'我的喜欢'};
let recycleBin=JSON.parse(localStorage.getItem('life-assistant-recycle-bin')||'[]');
if(!Array.isArray(recycleBin))recycleBin=[];
function saveRecycleBin(){localStorage.setItem('life-assistant-recycle-bin',JSON.stringify(recycleBin))}
function cloneData(data){return JSON.parse(JSON.stringify(data??{}))}
function moveToRecycle(module,title,content,originalData){
  recycleBin.unshift({id:`trash-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,module,title,content,originalData:cloneData(originalData),deletedAt:new Date().toISOString(),isDeleted:true});
  saveRecycleBin();
}
function restoreRecycleItem(item){
  const data=item.originalData||{};
  if(item.module==='learning'){learningRecords.splice(Math.min(numberValue(data.index),learningRecords.length),0,cloneData(data.data));saveLearningRecords()}
  if(item.module==='collection'){favoriteRecords.splice(Math.min(numberValue(data.index),favoriteRecords.length),0,cloneData(data.data));saveFavoriteRecords()}
  if(item.module==='goals'){hiddenGoalCards=hiddenGoalCards.filter(index=>index!==numberValue(data.index));localStorage.setItem('life-assistant-hidden-goal-cards',JSON.stringify(hiddenGoalCards))}
  if(item.module==='finance'){hiddenFinanceCards=hiddenFinanceCards.filter(key=>key!==data.key);localStorage.setItem('life-assistant-hidden-finance-cards',JSON.stringify(hiddenFinanceCards));if(data.expense||data.key==='expense-record'){const record=data.expense||data.data;expenseRecords.splice(Math.min(numberValue(data.index),expenseRecords.length),0,cloneData(record));saveExpenses();syncExpenseTotals()}}
  if(item.module==='travel'){travelPlaces.splice(Math.min(numberValue(data.index),travelPlaces.length),0,cloneData(data.data));saveTravelPlaces()}
  if(item.module==='interests'){interestRecords.splice(Math.min(numberValue(data.index),interestRecords.length),0,cloneData(data.data));saveInterestRecords()}
  if(item.module==='future'){futureRecords.splice(Math.min(numberValue(data.index),futureRecords.length),0,cloneData(data.data));saveFutureRecords()}
}
function formatRecycleDate(value){const date=new Date(value);if(Number.isNaN(date.getTime()))return value||'';return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`}
function renderRecyclePage(filter='全部'){
  const list=filter==='全部'?recycleBin:recycleBin.filter(item=>item.module===filter);
  shell('回收站',`<div class="page-heading recycle-heading"><div><h1>回收站</h1><p>删除的内容会暂时保存在这里，你可以随时恢复。</p></div></div><div class="recycle-toolbar"><div class="recycle-filters">${['全部','finance','goals','learning','travel','interests','future','collection'].map(key=>`<button class="recycle-filter ${filter===key?'active':''}" data-recycle-filter="${key}">${key==='全部'?'全部':recycleModuleNames[key]}</button>`).join('')}</div><div class="recycle-actions"><button class="secondary-btn" id="restoreAllTrash">全部恢复</button><button class="danger-btn" id="clearTrash">清空回收站</button></div></div><div class="grid recycle-grid">${list.length?list.map(item=>`<div class="card recycle-card"><div class="recycle-card-icon">${item.module==='finance'?'¥':'▣'}</div><div class="recycle-card-main"><h3>${escapeHTML(item.title||'未命名记录')}</h3><p>${escapeHTML(item.content||'')}</p><small>所属模块：${recycleModuleNames[item.module]||item.module}　删除时间：${formatRecycleDate(item.deletedAt)}</small></div><div class="recycle-card-actions"><button class="restore-trash" data-trash-id="${item.id}">恢复</button><button class="permanent-trash" data-trash-id="${item.id}">永久删除</button></div></div>`).join(''):'<div class="recycle-empty">回收站还是空的<br><small>删除的生活记录会暂时保存在这里。</small></div>'}</div>`);
  document.querySelectorAll('[data-recycle-filter]').forEach(button=>button.onclick=()=>renderRecyclePage(button.dataset.recycleFilter));
  document.querySelectorAll('.restore-trash').forEach(button=>button.onclick=()=>{const index=recycleBin.findIndex(item=>item.id===button.dataset.trashId);if(index<0)return;restoreRecycleItem(recycleBin[index]);recycleBin.splice(index,1);saveRecycleBin();renderRecyclePage(filter);toast('已恢复到原模块')});
  document.querySelectorAll('.permanent-trash').forEach(button=>button.onclick=()=>{if(!confirm('删除后无法恢复，确定继续吗？'))return;recycleBin=recycleBin.filter(item=>item.id!==button.dataset.trashId);saveRecycleBin();renderRecyclePage(filter);toast('已永久删除')});
  document.querySelector('#restoreAllTrash').onclick=()=>{recycleBin.slice().forEach(restoreRecycleItem);recycleBin=[];saveRecycleBin();renderRecyclePage('全部');toast('已全部恢复')};
  document.querySelector('#clearTrash').onclick=()=>{if(!recycleBin.length||!confirm('清空后无法恢复，确定继续吗？'))return;recycleBin=[];saveRecycleBin();renderRecyclePage('全部');toast('回收站已清空')};
}
const previousModulePageForRecycle=modulePage;
modulePage=function(key){if(key==='recycle'){renderRecyclePage();return}previousModulePageForRecycle(key);bindAdditionalModuleTrashButtons()};

function bindAdditionalModuleTrashButtons(){
  const add=(selector,module,getData,getTitle,getContent)=>document.querySelectorAll(selector).forEach((card,index)=>{if(card.querySelector('.recycle-delete-button'))return;const button=document.createElement('button');button.type='button';button.className='recycle-delete-button';button.textContent='🗑';button.setAttribute('aria-label','移入回收站');button.dataset.recycleModule=module;button.dataset.recycleIndex=index;card.appendChild(button)});
  if(currentPage==='travel')add('.travel-place-grid .travel-card','travel',i=>travelPlaces[i],i=>travelPlaces[i]?.name,i=>travelPlaces[i]?.note);
  add('.interest-record-card','interests',i=>interestRecords[i],i=>interestRecords[i]?.title,i=>interestRecords[i]?.content);
  add('.future-record-card','future',i=>futureRecords[i],i=>futureRecords[i]?.title,i=>futureRecords[i]?.content);
}
document.addEventListener('click',event=>{
  const button=event.target.closest('.goal-delete-button,.learning-delete-button,.favorite-delete-button,.finance-delete-button,.recycle-delete-button');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(!confirm('确定将这条内容移入回收站吗？'))return;
  let module,title,content,originalData;
  if(button.classList.contains('goal-delete-button')){const index=[...document.querySelectorAll('.module-grid .module-card')].indexOf(button.closest('.module-card'));const data=moduleData.goals[index];module='goals';title=data?.[0];content=data?.[1];originalData={index}}
  if(button.classList.contains('learning-delete-button')){const index=Number(button.dataset.learningDelete);module='learning';originalData={index,data:learningRecords[index]};title=learningRecords[index]?.title;content=learningRecords[index]?.content}
  if(button.classList.contains('favorite-delete-button')){const index=Number(button.closest('.favorite-card')?.querySelector('[data-favorite-edit]')?.dataset.favoriteEdit);module='collection';originalData={index,data:favoriteRecords[index]};title=favoriteRecords[index]?.name;content=favoriteRecords[index]?.reason}
  if(button.classList.contains('finance-delete-button')){const key=button.closest('.module-card')?.dataset.financeKey||['income','expense','balance','savings'][[...document.querySelectorAll('.module-grid .module-card')].indexOf(button.closest('.module-card'))];module='finance';originalData={key};title=key==='income'?'本月收入':key==='expense'?'本月支出':key==='balance'?'本月结余':'储蓄目标';content='财务记录'}
  if(button.classList.contains('recycle-delete-button')){const index=Number(button.dataset.recycleIndex);module=button.dataset.recycleModule;const data=module==='travel'?travelPlaces[index]:module==='interests'?interestRecords[index]:futureRecords[index];originalData={index,data};title=data?.name||data?.title;content=data?.note||data?.content}
  if(!module)return;moveToRecycle(module,title,content,originalData);
  if(module==='goals'){const index=originalData.index;if(!hiddenGoalCards.includes(index))hiddenGoalCards.push(index);localStorage.setItem('life-assistant-hidden-goal-cards',JSON.stringify(hiddenGoalCards));modulePage('goals')}
  if(module==='learning'){learningRecords.splice(originalData.index,1);saveLearningRecords();modulePage('learning')}
  if(module==='collection'){favoriteRecords.splice(originalData.index,1);saveFavoriteRecords();modulePage('collection')}
  if(module==='finance'){if(!hiddenFinanceCards.includes(originalData.key))hiddenFinanceCards.push(originalData.key);localStorage.setItem('life-assistant-hidden-finance-cards',JSON.stringify(hiddenFinanceCards));modulePage('finance')}
  if(module==='travel'){travelPlaces.splice(originalData.index,1);saveTravelPlaces();travel()}
  if(module==='interests'){interestRecords.splice(originalData.index,1);saveInterestRecords();modulePage('interests')}
  if(module==='future'){futureRecords.splice(originalData.index,1);saveFutureRecords();modulePage('future')}
  toast('已移入回收站');
},true);
const previousTravelForRecycle=travel;travel=function(){previousTravelForRecycle();bindAdditionalModuleTrashButtons()};
const previousNavigateForRecycle=navigate;navigate=function(page){previousNavigateForRecycle(page);bindAdditionalModuleTrashButtons()};
renderNav();
const previousShowExpenseDetailForRecycle=showExpenseDetail;
showExpenseDetail=function(){previousShowExpenseDetailForRecycle();document.querySelectorAll('.editable-expense-row').forEach(row=>{if(row.querySelector('.expense-trash-button'))return;const button=document.createElement('button');button.type='button';button.className='expense-trash-button';button.textContent='🗑';button.dataset.expenseIndex=row.querySelector('[data-expense-index]')?.dataset.expenseIndex;button.setAttribute('aria-label','移入回收站');row.appendChild(button)})};

/* Activate the independent homepage only after every data module is initialized. */
home=renderSceneHomepage;
home();
