const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'records.json');

app.use(express.json());
app.use(express.static(__dirname));

function load() { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { return []; } }
function save(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

// ---- 宠物行为问题知识库 ----
const BEHAVIORS = [
  { id: 'scratching', name: '乱抓家具', species: ['猫'], category: '破坏', severity: '中',
    desc: '猫抓沙发、窗帘等家具，是正常磨爪行为，但位置不对。',
    causes: ['爪子需要磨爪', '领地标记', '缺乏合适的抓板', '压力/焦虑'],
    solutions: ['提供多处竖/横抓板', '在家具上贴双面胶/锡箔', '定期修剪指甲', '使用费洛蒙喷雾', '增加互动玩耍'],
    tags: ['抓', '沙发', '家具', '磨爪'] },
  { id: 'biting', name: '咬人/咬物', species: ['猫', '狗'], category: '攻击', severity: '高',
    desc: '宠物咬人或咬家具，可能出于游戏、恐惧或护食。',
    causes: ['幼年未学会控制力度', '过度兴奋', '恐惧/防御', '护食', '无聊/能量过剩'],
    solutions: ['停止互动直到平静', '提供咀嚼玩具', '增加运动量', '避免用手逗玩', '必要时咨询行为师'],
    tags: ['咬', '攻击', '护食', '玩具'] },
  { id: 'meowing', name: '半夜叫唤', species: ['猫'], category: '噪音', severity: '中',
    desc: '猫在夜间频繁叫唤，影响睡眠。',
    causes: ['饥饿', '无聊/求关注', '发情', '老年认知障碍', '环境变化'],
    solutions: ['睡前喂食', '白天增加互动', '绝育', '夜间避免回应', '检查健康问题'],
    tags: ['叫', '夜', '睡眠', '噪音'] },
  { id: 'toilet', name: '随地大小便', species: ['猫', '狗'], category: '卫生', severity: '高',
    desc: '宠物不在指定地点如厕。',
    causes: ['猫砂盆脏/位置不对', '泌尿系统疾病', '压力/领地焦虑', '训练不足', '年龄/认知问题'],
    solutions: ['保持猫砂盆清洁（每天铲）', '每只猫+1个砂盆', '排查医疗问题', '使用酶清洁剂', '逐步训练'],
    tags: ['如厕', '猫砂', '尿', '便'] },
  { id: 'anxiety', name: '分离焦虑', species: ['狗', '猫'], category: '情绪', severity: '高',
    desc: '主人离开时宠物表现出极度焦虑（吠叫、破坏、随地大小便）。',
    causes: ['过度依恋', '缺乏独处训练', '环境变化', '遗传倾向'],
    solutions: ['逐步延长独处时间', '离开前给予零食玩具', '不刻意告别', '提供白噪音', '严重时药物辅助'],
    tags: ['焦虑', '分离', '吠叫', '破坏'] },
  { id: 'aggression', name: '攻击性行为', species: ['狗', '猫'], category: '攻击', severity: '高',
    desc: '宠物对人或其他动物表现出攻击性（露齿、嘶吼、扑咬）。',
    causes: ['恐惧', '领地保护', '疼痛/疾病', '社交化不足', '资源保护'],
    solutions: ['避免触发因素', '正向强化训练', '咨询认证行为师', '必要时药物干预', '安全隔离'],
    tags: ['攻击', '露齿', '嘶吼', '恐惧'] },
  { id: 'eating', name: '挑食/拒食', species: ['猫', '狗'], category: '饮食', severity: '中',
    desc: '宠物挑食或拒食，可能影响营养。',
    causes: ['食物变化', '压力', '口腔疾病', ' spoiled by treats', ' Bowl 位置'],
    solutions: ['定时喂食（15分钟收走）', '逐步换粮', '检查牙齿', '减少零食', '必要时 veterinary 检查'],
    tags: ['挑食', '拒食', '饮食', '营养'] },
  { id: 'jumping', name: '扑人', species: ['狗'], category: '礼仪', severity: '低',
    desc: '狗 excitedly 扑向人，可能造成伤害或弄脏衣服。',
    causes: ['兴奋', '寻求关注', '缺乏训练', '能量过剩'],
    solutions: ['转身忽略直到四脚着地', '训练 "sit" 指令', '不回应扑人', '增加运动'],
    tags: ['扑', '兴奋', '礼仪', '训练'] },
  { id: 'barking', name: '过度吠叫', species: ['狗'], category: '噪音', severity: '中',
    desc: '狗长时间或频繁吠叫。',
    causes: ['警戒', '无聊', '分离焦虑', '需求未满足', '遗传'],
    solutions: ['确认吠叫原因', '提供充足运动', '训练 "quiet" 指令', '移除刺激源', '避免惩罚'],
    tags: ['吠', '叫', '噪音', '警戒'] },
  { id: 'chewing', name: '咬坏物品', species: ['狗'], category: '破坏', severity: '中',
    desc: '狗咬坏鞋子、家具等物品。',
    causes: ['幼犬出牙', '无聊', '焦虑', '缺乏咀嚼出口'],
    solutions: ['提供咀嚼玩具', '收好贵重物品', '增加运动', '喷苦味剂', ' crate 训练'],
    tags: ['咬', '破坏', '咀嚼', '玩具'] }
];

// ---- 训练课程 ----
const COURSES = [
  { id: 'basic-obedience', title: '基础服从训练', species: ['狗'], level: '入门', duration: '4周',
    desc: '坐、卧、来、停等基础指令训练，建立人宠沟通。',
    steps: [' Week1: 建立注意力', 'Week2: 坐/卧指令', 'Week3: 来/停指令', 'Week4: 泛化与巩固'] },
  { id: 'cat-litter', title: '猫砂盆训练', species: ['猫'], level: '入门', duration: '1-2周',
    desc: '帮助猫咪快速适应猫砂盆，解决如厕问题。',
    steps: ['选择合适猫砂', '正确放置猫砂盆', '引导猫咪进入', '保持清洁', '正向强化'] },
  { id: 'separation', title: '分离焦虑管理', species: ['狗', '猫'], level: '进阶', duration: '6-8周',
    desc: '逐步训练宠物独处能力，缓解分离焦虑。',
    steps: ['建立安全空间', '短时离开训练', '增加独处玩具', '不刻意告别', '逐步延长'] },
  { id: 'socialization', title: '社会化训练', species: ['狗', '猫'], level: '入门', duration: '持续',
    desc: '帮助幼宠适应不同人、动物、环境。',
    steps: ['控制接触强度', '正向体验', '避免强迫', '观察肢体语言', '逐步扩展'] },
  { id: 'clicker', title: '点击器训练', species: ['狗', '猫'], level: '入门', duration: '2周',
    desc: '使用点击器进行标记训练，提高训练效率。',
    steps: ['建立点击器关联', '标记正确行为', '逐步增加难度', '泛化到新环境'] }
];

// ---- API ----
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/api/behaviors', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const species = req.query.species;
  let list = BEHAVIORS;
  if (species) list = list.filter(b => b.species.includes(species));
  if (q) list = list.filter(b => b.name.toLowerCase().includes(q) || b.desc.toLowerCase().includes(q) || b.tags.some(t => t.toLowerCase().includes(q)));
  res.json(list);
});

app.get('/api/courses', (req, res) => {
  const species = req.query.species;
  let list = COURSES;
  if (species) list = list.filter(c => c.species.includes(species));
  res.json(list);
});

app.get('/api/tags', (req, res) => res.json([...new Set(BEHAVIORS.flatMap(b => b.tags))]));

// 行为评估
app.post('/api/assess', (req, res) => {
  const { petType = '狗', behaviorId, frequency = '偶尔', severity = '轻' } = req.body || {};
  const b = BEHAVIORS.find(x => x.id === behaviorId);
  if (!b) return res.status(404).json({ error: 'behavior not found' });
  let risk = 0;
  if (frequency === '经常') risk += 40; else if (frequency === '偶尔') risk += 20; else risk += 10;
  if (severity === '严重') risk += 40; else if (severity === '中等') risk += 25; else risk += 10;
  if (b.severity === '高') risk += 20;
  const level = risk >= 70 ? '高风险' : risk >= 40 ? '中风险' : '低风险';
  const advice = risk >= 70 ? '建议尽快咨询认证动物行为师' : risk >= 40 ? '建议开始系统训练并关注' : '可先尝试基础训练方案';
  res.json({ behavior: b, risk, level, advice, solutions: b.solutions });
});

// 记录管理
app.post('/api/records', (req, res) => {
  const { petName = '', petType = '狗', behaviorId = '', notes = '' } = req.body || {};
  const r = { id: crypto.randomUUID(), ts: new Date().toISOString(), petName, petType, behaviorId, notes };
  const all = load(); all.unshift(r); save(all.slice(0, 200));
  res.json(r);
});

app.get('/api/records', (req, res) => res.json(load()));
app.get('/api/records/:id', (req, res) => { const r = load().find(x => x.id === req.params.id); if (!r) return res.status(404).json({ error: 'not found' }); res.json(r); });
app.delete('/api/records/:id', (req, res) => { const all = load().filter(x => x.id !== req.params.id); save(all); res.json({ ok: true }); });

app.listen(PORT, () => console.log(`Pet Behavior Guide running on http://localhost:${PORT}`));