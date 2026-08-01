/* ========================================
   卿卿日常 · 表达训练模块
   借物表达训练 — 随机物品 + 1分钟描述词 + 表达方法
   ======================================== */

const Expression = {
  // 当前选中的物品
  current: null,

  // 今日练习记录
  todayRecord: null,

  // 预置物品模板库（15个）
  items: [
    {
      name: '红苹果',
      emoji: '🍎',
      bgGradient: 'linear-gradient(135deg, #f3e1d5 0%, #e8c9b0 30%, #d4a08a 60%, #c4826c 100%)',
      description: `今天我们来描述这个红苹果。

看它的颜色——不是单调的红，而是从深红到浅绯的渐变，像傍晚天边那一抹晚霞被揉进了果皮里。表面光滑，带着微微的蜡质感，灯光打上去，有一个柔和的高光点。

拿在手里，它比想象中沉。圆润的弧线完美贴合掌心，冰冰凉凉的触感从指尖传来。凑近闻，有一丝清甜的果香，淡淡的，不浓烈，却让人想起秋天的果园。

咬一口——清脆的"咔嚓"声，汁水在口腔里迸开，酸甜交织。这不是一个完美的苹果，表皮上有一小道褐色的痕迹，但正是这个小瑕疵，让它变得真实。`,
      techniques: [
        { label: '五感法', desc: '视觉（颜色渐变）→ 触觉（重量、温度）→ 嗅觉（果香）→ 听觉（咔嚓声）→ 味觉（酸甜）' },
        { label: '对比法', desc: '将红色比作"晚霞揉进果皮"，用熟悉的事物建立画面感' },
        { label: '瑕疵美学', desc: '最后点出褐色痕迹，让描述从"完美"走向"真实"，增加记忆点' },
        { label: '节奏控制', desc: '短句→长句→短句交替，营造朗读的呼吸感' },
      ],
    },
    {
      name: '燃烧的蜡烛',
      emoji: '🕯️',
      bgGradient: 'linear-gradient(135deg, #f5efe6 0%, #ebe0d0 30%, #d4c4a8 60%, #c4a97d 100%)',
      description: `让我们来聊聊这支蜡烛。

白色的蜡柱，安静地立在铜制烛台上。火焰不大，却稳定——外层是几乎透明的蓝，中间是明亮的金黄，最里面是一小簇幽蓝的芯。它轻轻摇曳，像在跳一支没有音乐的舞。

熔化的蜡油沿着烛身缓缓滑落，像眼泪，也像时间的具象。每一滴都在凝固的瞬间定格，层层叠叠，记录着燃烧的长度。

空气里有淡淡的焦香，混着若有若无的蜂蜜味——这是一支蜂蜡蜡烛。烛光在墙上投下晃动的影子，整个房间都被笼上了一层温暖的琥珀色滤镜。

它已经燃烧了二十分钟。烛身矮了一截，但火焰依然是那朵火焰——不紧不慢，专注地亮着。`,
      techniques: [
        { label: '层次描述', desc: '从外到内（白蜡→火焰→蜡油），从静到动（烛身→摇曳→蜡油滑落）' },
        { label: '诗意比喻', desc: '"像眼泪，也像时间的具象"——把日常现象赋予哲思' },
        { label: '氛围营造', desc: '不只描述物品本身，还描述它对环境的影响（墙上影子、琥珀色滤镜）' },
        { label: '时间线叙事', desc: '从"此刻"拉回"二十分钟前"，制造时间纵深' },
      ],
    },
    {
      name: '咖啡杯',
      emoji: '☕',
      bgGradient: 'linear-gradient(135deg, #ede8e0 0%, #ddd5c8 30%, #c4b8a7 60%, #a89880 100%)',
      description: `一个白色的陶瓷咖啡杯，静静地冒着热气。

杯壁很厚，捧在掌心，热度透过陶瓷缓缓渗透进皮肤——不是烫，是刚刚好的温暖。杯口有一圈手绘的深蓝色条纹，不完美，有轻微的粗细变化，正是手工上釉的痕迹。

杯中的咖啡是深褐色的，表面浮着一层细密的浅金色油脂。热气打着旋升起来，带着焦糖和坚果的香气，整个空间都被这股味道填满了。

杯沿有一处浅浅的唇印——这是日常使用的证据。杯底内侧有一圈深色的咖啡渍，怎么洗都洗不掉。但这些"不完美"恰恰让这个杯子有了故事，它不是橱窗里的摆设，而是每天清晨六点半准时出现的伙伴。`,
      techniques: [
        { label: '触觉优先', desc: '从"杯壁很厚"到"热度渗透皮肤"，用触觉建立亲密感' },
        { label: '细节特写', desc: '手绘条纹的粗细变化、杯沿唇印、杯底咖啡渍——这些微观细节是画面感的来源' },
        { label: '情感投射', desc: '将物品人格化——"每天清晨六点半准时出现的伙伴"' },
        { label: '动静结合', desc: '静态的杯子 + 动态的热气 + 扩散的香气' },
      ],
    },
    {
      name: '旧书',
      emoji: '📖',
      bgGradient: 'linear-gradient(135deg, #e8d5c4 0%, #d4b896 30%, #c4a382 60%, #a07850 100%)',
      description: `这是一本旧书，拿在手里沉甸甸的。

封面是暗红色的布面装帧，边角已经磨得发白，露出下面的纸板。书名是烫金的，大半已经褪色，只剩下若隐若现的压痕。翻开书页，纸张泛着均匀的黄褐色——不是霉斑，而是岁月均匀涂抹的颜色。

书页边缘有些毛糙，说明它被翻阅过无数次。纸面微微粗糙，指尖划过能感到细小的纤维阻力。靠近书脊的地方，还能闻到一种特别的味道：旧纸、干墨、灰尘和时间混在一起的"书香"。

翻到第127页，有一行用铅笔划过的细细的线——上一个读者留下的痕迹。你不知道他是谁，但这一刻，你们在这行字上相遇了。`,
      techniques: [
        { label: '视觉考古', desc: '从封面到书页到书脊，逐层"挖掘"细节，像考古一样描述' },
        { label: '触觉语言', desc: '"纸面微微粗糙""纤维阻力"——用精准的触觉词汇' },
        { label: '气味记忆', desc: '旧书的味道是通用记忆锚点，能瞬间唤起共鸣' },
        { label: '读者钩子', desc: '最后用"上一个读者的铅笔线"制造悬念和情感连接' },
      ],
    },
    {
      name: '绿植盆栽',
      emoji: '🌿',
      bgGradient: 'linear-gradient(135deg, #dce8d5 0%, #c5d8b5 30%, #a8c49a 60%, #8b9d83 100%)',
      description: `这盆绿植放在窗台上，阳光正好穿过它。

叶子是心形的，每一片都有手掌那么大。叶脉清晰，从中间的主脉向两侧对称延伸，像一片微缩的绿色地图。新长出来的嫩叶是半透明的浅绿，老叶则是浓郁的墨绿，一层一层叠在一起，有了深浅的层次。

茎是柔韧的，微微弯曲着朝向窗户——植物都有向光性，它在用自己的方式追逐阳光。花盆是素烧的陶土盆，表面有细密的气孔，浇水的时候能听到水渗进泥土的"滋滋"声。

手指轻轻拂过叶片，表面光滑微凉，带着植物特有的蜡质感。翻过叶子背面，颜色淡了很多，叶脉更加突出，像一片绿色的浮雕。`,
      techniques: [
        { label: '空间定位', desc: '开篇设定场景——"窗台上，阳光穿过"——让读者立刻有了画面' },
        { label: '对比观察', desc: '嫩绿 vs 墨绿，正面 vs 背面，用对比来丰富描述' },
        { label: '知识融入', desc: '"向光性"——自然融入科学小知识，增加内容厚度' },
        { label: '多感官', desc: '视觉（颜色层次）+ 听觉（浇水滋滋声）+ 触觉（光滑微凉）' },
      ],
    },
    {
      name: '镜子',
      emoji: '🪞',
      bgGradient: 'linear-gradient(135deg, #e8eef0 0%, #d0dce2 30%, #b8c8d4 60%, #7b9ea8 100%)',
      description: `这是一面圆形的梳妆镜，镶在黄铜色的边框里。

镜面擦得很干净，几乎没有一丝指纹。你看向它的时候，它诚实地回望你——你的眼睛、你的表情、你微微歪头的角度，全被它原封不动地还回来。镜子不说话，但它从不撒谎。

镜框上有一些细小的划痕，每一道都是时间的签名。把它微微倾斜，镜面里的世界也随之倾斜——光线在镜面上打了个弯，在天花板上投下一小块晃动的光斑。

凑近一点，镜子里映出了你的瞳孔，瞳孔里有一个更小的你，小镜子里还有更小的镜子——无限递归。这一刻你会想：镜子里的那个世界，和我们的世界，到底哪个才是真实的？`,
      techniques: [
        { label: '拟人开场', desc: '"镜子不说话，但它从不撒谎"——赋予物品人格，建立情感张力' },
        { label: '互动描述', desc: '不只描述镜子本身，还描述"你看向它"的互动过程' },
        { label: '物理现象', desc: '镜面反光投射光斑——用日常物理现象增加画面生动性' },
        { label: '哲学收尾', desc: '从镜子谈到"无限递归"和"真实与虚幻"，拔高立意' },
      ],
    },
    {
      name: '老钥匙',
      emoji: '🔑',
      bgGradient: 'linear-gradient(135deg, #f0e8d8 0%, #e0d0b0 30%, #c8b080 60%, #b8956e 100%)',
      description: `一把黄铜钥匙，躺在手心，凉凉的，沉沉的。

匙柄是一个精致的镂空花纹——可能是藤蔓，也可能是字母，岁月的磨损让它变得模糊不清。匙杆上有一道道细密的齿，每一道齿都曾经严丝合缝地对准锁芯里的弹子。

它曾经打开过什么？一扇老宅的木门？一个樟木箱子的铜锁？还是一个早已被遗忘的抽屉？这把钥匙已经失去了它的锁，但它依然保持着钥匙的形状——那是它的身份，它的尊严。

对着光看，铜面上有一层深褐色的氧化层，这是时间的包浆。边缘磨得很光滑，说明它被握过无数次——也许是一个老人每天早晨开门时握过的。现在它躺在这里，安静地讲述一个没有声音的故事。`,
      techniques: [
        { label: '悬念提问', desc: '"它曾经打开过什么？"——用提问引导观众思考，增加互动感' },
        { label: '拟人升华', desc: '"那是它的身份，它的尊严"——赋予物品人格和尊严感' },
        { label: '痕迹推理', desc: '从氧化层、磨损边缘反推使用历史——像侦探一样描述' },
        { label: '留白结尾', desc: '"安静地讲述一个没有声音的故事"——不说完，给听众留想象空间' },
      ],
    },
    {
      name: '雨伞',
      emoji: '☂️',
      bgGradient: 'linear-gradient(135deg, #d5dce8 0%, #c0cde0 30%, #8ba0c0 60%, #6b8f9b 100%)',
      description: `一把长柄雨伞，靠在门边，伞面上还挂着没干的水珠。

它是深蓝色的，像暴风雨前的天空。伞布绷得很紧，手指弹上去有"嘭嘭"的闷响。伞骨是黑色的金属，八根骨架均匀分布，撑开的时候像一朵绽放的蓝色花朵。

雨滴顺着伞面滑下来，一滴追着一滴，在伞尖汇成一颗大水滴，悬在那里，亮晶晶的，像一颗透明的宝石。然后它终于落下——"嗒"——在地上碎成一小片水花。

握住伞柄，是光滑的木质手感，有一处拇指压出来的浅浅凹痕——用得久了，连木头都记住了主人的手型。

下雨天，一把伞就是一个移动的屋顶。它不说话，但陪你走过每一场雨。`,
      techniques: [
        { label: '动态捕捉', desc: '聚焦"水滴滑落"的瞬间——从汇聚到悬停到坠落的完整过程' },
        { label: '声音模拟', desc: '"嘭嘭""嗒"——用拟声词增加临场感' },
        { label: '微观特写', desc: '"拇指压出来的浅浅凹痕"——放大日常忽略的细节' },
        { label: '诗意定义', desc: '"移动的屋顶"——给日常物品一个诗意的重新定义' },
      ],
    },
    {
      name: '毛线球',
      emoji: '🧶',
      bgGradient: 'linear-gradient(135deg, #f5f0e8 0%, #ede0d0 30%, #dcc8b0 60%, #bfb5ab 100%)',
      description: `一个毛线球，松松地蜷在竹篮里。

线是燕麦色的——不是纯白，是带一点暖调的米色，像早晨第一杯奶茶的颜色。毛线表面有细密的绒毛，在光线下能看到一层柔和的晕圈。

把线球拿起来，它比看起来轻。手指陷进去，软软的，有弹性的回馈——像握住了一团云。线头从球体表面冒出来，轻轻一拉，毛线球就会在篮子里打转，一圈一圈地解开自己。

你想象这团毛线曾经穿过织针，一针上一针下，慢慢变成一条围巾或一件毛衣。每一米线都经过了手指的温度，这不是一个普通的毛线球——它是一件未完成作品的开始，是冬天到来之前的一个温暖承诺。`,
      techniques: [
        { label: '色彩通感', desc: '"燕麦色""奶茶的颜色"——用食物来定义颜色，更直观亲切' },
        { label: '触觉比喻', desc: '"像握住了一团云"——用不可能的比喻来传达极致柔软' },
        { label: '动态画面', desc: '"一圈一圈地解开自己"——用拟人化的动态描述' },
        { label: '故事延伸', desc: '从毛线球延伸到围巾、冬天、温暖承诺——拓展物品的意义边界' },
      ],
    },
    {
      name: '沙漏',
      emoji: '⏳',
      bgGradient: 'linear-gradient(135deg, #f0ebe0 0%, #e8dcc8 30%, #d4c4a0 60%, #c8a882 100%)',
      description: `一个玻璃沙漏，立在桌面上，沙子正在流动。

上下两个对称的玻璃球，中间是一道细细的瓶颈。上方的沙子堆成一个小山丘，沙粒一颗一颗地从瓶颈挤过去，落到底部，堆成另一个小山丘。上方的在减少，下方的在增多——时间被沙子翻译成了一场缓慢的迁徙。

沙粒是白色的，极细，几乎像粉末。在瓶颈处，它们加速——形成一条不间断的细线，像一条微型的瀑布。翻转过来，一切重新开始。上变成下，过去变成未来。

盯着它看久了，你会产生一种奇妙的感觉：时间的流逝变得肉眼可见了。每一粒沙子的坠落都是一秒的逝去。而沙漏最温柔的地方是——它允许你翻转，允许你重新开始。`,
      techniques: [
        { label: '过程描写', desc: '完整描绘沙粒从上方→瓶颈→底部的流动过程' },
        { label: '哲学提炼', desc: '"时间被沙子翻译成了一场缓慢的迁徙"——用隐喻升华日常现象' },
        { label: '对称结构', desc: '"上变成下，过去变成未来"——用对仗句式增加节奏美' },
        { label: '情感落点', desc: '最后落在"允许重新开始"——在哲学思考后给出温柔的人文关怀' },
      ],
    },
    {
      name: '肥皂泡',
      emoji: '🫧',
      bgGradient: 'linear-gradient(135deg, #e8e8f0 0%, #d8d8f0 30%, #c0c8e8 60%, #a0a8d8 100%)',
      description: `一串肥皂泡从塑料环上飞出来，飘向天空。

最大的那个有乒乓球大小。它的表面不是透明的——是流动的彩虹。粉紫、翠绿、钴蓝，在薄膜上不停旋转、变换，像一层极薄的液态宝石。这是因为光线在肥皂膜的两层表面之间来回反射，产生了干涉。

它飘起来了，晃晃悠悠的，像一个喝醉了的小星球。经过窗边的时候，它映出了窗户的轮廓——一个微缩的、弯曲的世界被装进了这个直径五厘米的球体里。

然后——"啵"——它破了。那么轻的一声，几乎听不到。没有碎片，没有痕迹，刚才还那么美的东西，说消失就消失了。

但更多的泡泡正在诞生。一个接一个，每一个都知道自己会破，但每一个都在短暂的生命里尽情地反射着彩虹。`,
      techniques: [
        { label: '科学+诗意', desc: '先用科学解释干涉原理，再用"液态宝石"诗意转译——理性与感性并存' },
        { label: '微观世界观', desc: '"喝醉了的小星球""微缩的弯曲世界"——把泡泡放大成宇宙' },
        { label: '声音设计', desc: '"啵"——用一个极轻的拟声词制造消失的瞬间感' },
        { label: '生命隐喻', desc: '结尾将泡泡的一生升华为生命哲学——明知会破灭，依然尽情闪耀' },
      ],
    },
    {
      name: '河边的石头',
      emoji: '🪨',
      bgGradient: 'linear-gradient(135deg, #e0e4e8 0%, #d0d8e0 30%, #b8c4d0 60%, #9b8e83 100%)',
      description: `一块鹅卵石，灰蓝色的，安静地躺在掌心。

它的表面光滑得不可思议——不是人工打磨的那种光滑，而是被水流冲刷了千万次之后，大自然用手一点一点磨出来的。摸上去凉丝丝的，像刚从冰箱里取出来。

石头上有几条白色的纹路，弯弯曲曲，像一幅微缩的山水画。如果你发挥想象力——这条纹路是山脉，那条纹路是河流，深色的斑点是一个小小的湖泊。一块石头，就是一个世界。

翻过来，底面稍微粗糙一些，有一些细小的凹坑——那是它没有被水流眷顾的那一面。把石头握在拳头里，它刚好填满掌心。它的温度慢慢和体温一致，好像它变成了你身体的一部分。

这块石头可能已经存在了几百万年。在它面前，我们的烦恼不过是弹指一挥间。`,
      techniques: [
        { label: '对比开篇', desc: '"不是人工打磨，而是水流冲刷"——用对比突出自然的力量' },
        { label: '想象力引导', desc: '"如果你发挥想象力——"主动邀请观众参与画面构建' },
        { label: '正反两面', desc: '描述光滑面 + 粗糙底面——完整的观察才有说服力' },
        { label: '时空缩放', desc: '从掌心温度拉到几百万年地质时间——用时空对比制造震撼感' },
      ],
    },
    {
      name: '丝带',
      emoji: '🎀',
      bgGradient: 'linear-gradient(135deg, #e8e0d8 0%, #d8ccc0 30%, #c0b0a0 60%, #8a9b8f 100%)',
      description: `一条墨绿色的丝带，搭在手指上，像一片温柔的瀑布。

它是真丝的——对着光看，有珍珠一样柔和的光泽。丝带表面光滑得几乎没有摩擦力，从指间滑过的时候，你能感觉到那种"抓不住"的柔顺感。轻轻一抖，它就在空气中荡漾开来，像水波一样起伏。

把它折起来，它会留下浅浅的折痕——丝绸有记忆，它记得每一个折叠的动作。把它拉直，折痕慢慢消失，但不是完全消失，凑近了还是能看到那一道淡淡的印记。

墨绿色很衬肤色——把丝带绕在手腕上，手腕立刻显得白皙了几分。这就是配饰的魔力：不是它有多好看，是它让戴它的人变得好看。

如果你用它扎一个蝴蝶结——两环、一绕、一拉——一条普通的丝带就有了结构，有了形状，有了存在的宣言。`,
      techniques: [
        { label: '动态质感', desc: '"从指间滑过""在空气中荡漾"——用动态来展示丝绸的质感' },
        { label: '记忆隐喻', desc: '"丝绸有记忆"——用拟人化手法描述物理特性' },
        { label: '场景应用', desc: '不只描述丝带本身，还演示如何绕在手腕、扎蝴蝶结' },
        { label: '价值升华', desc: '"配饰的魔力：不是它好看，是它让戴它的人好看"——重新定义物品价值' },
      ],
    },
    {
      name: '落叶',
      emoji: '🍂',
      bgGradient: 'linear-gradient(135deg, #f0d8c0 0%, #e8c8a0 30%, #d4a878 60%, #c4826c 100%)',
      description: `一片枫叶，落在人行道上，颜色像一团燃烧的火焰。

从叶柄到叶尖，颜色在渐变——根部是残留的绿，中间是饱满的黄，边缘是浓烈的红。一片叶子上，浓缩了整个秋天的色谱。叶脉从中间向五个叶尖放射，像一张精密的微型交通网络。

把它捡起来，叶子已经干透了。轻轻一捏，发出"咔嚓咔嚓"的脆响，边缘碎了一小块，粉末从指间飘落。它那么轻，几乎没有重量——生命的最后形态，就是把所有的水分交还给空气，只留下一个精致的骨架。

对着阳光看，半透明的叶片里，叶脉更加清晰了。像一片琥珀色的彩色玻璃。

它曾经在枝头绿过，在风中摇摆过，被雨打过，被阳光吻过。现在它完成了这一年的使命，安静地躺在地上，等待被扫走，或者被风吹到更远的地方。`,
      techniques: [
        { label: '色谱描述', desc: '"从根部残留的绿到边缘浓烈的红"——用精确的颜色词构建视觉梯度' },
        { label: '结构类比', desc: '"微型交通网络""彩色玻璃"——用熟悉的系统类比自然结构' },
        { label: '生命回顾', desc: '结尾回顾叶子的一生——"绿过、摇摆过、被打过、被吻过"' },
        { label: '接受消逝', desc: '不回避枯萎和消逝，而是平静地描述它——这是东方美学中的"物哀"' },
      ],
    },
    {
      name: '月亮',
      emoji: '🌙',
      bgGradient: 'linear-gradient(135deg, #d8dce8 0%, #c0c8e0 30%, #8898c0 60%, #6b7b9b 100%)',
      description: `抬头看，今晚的月亮很圆，挂在深蓝色的天幕上。

它不是惨白的，是温润的象牙白，边缘有一圈极淡的光晕——那是月光穿过大气层时被散射形成的。月亮表面有一些暗色的斑块，那是月海，是远古火山喷发后留下的玄武岩平原。

月亮不发光，它只是在反射太阳的光。但正是这个"借来的光"，照亮了人类几千年的夜晚。没有月亮，就不会有"床前明月光"，不会有"千里共婵娟"，不会有阿波罗11号，也不会有此刻正在抬头看它的你。

一片薄云飘过来，月亮被遮住了一角。光暗了一瞬，然后云飘走了，月光重新洒下来——好像什么都没有发生过。但你知道，月亮一直在那里，不管你看不看它，它都在绕地球转，以每秒一公里的速度。`,
      techniques: [
        { label: '科学锚点', desc: '"月海是玄武岩平原""月光是反射的太阳光"——用精准的科学知识做地基' },
        { label: '文化串联', desc: '从李白到苏轼到阿波罗——用文化引用拓宽描述维度' },
        { label: '动静对比', desc: '云飘月隐（动）→ 月光重洒（静）→ 月亮恒转（永恒动）' },
        { label: '观众连接', desc: '"此刻正在抬头看它的你"——打破第四面墙，连接观众' },
      ],
    },
  ],

  init() {
    this.loadToday();
    this.randomize();
    this.bindEvents();
  },

  // 读取今日练习记录
  loadToday() {
    const today = Helpers.today();
    const record = Storage.get('expression_today');
    if (record && record.date === today) {
      this.todayRecord = record;
    } else {
      this.todayRecord = { date: today, practiced: false, items: [] };
    }
  },

  // 保存今日记录
  saveToday() {
    Storage.set('expression_today', this.todayRecord);
  },

  // 随机选取一个物品
  randomize() {
    // 尽量不和今天已经练过的重复
    const available = this.items.filter(
      item => !this.todayRecord.items.includes(item.name)
    );
    const pool = available.length > 0 ? available : this.items;
    const idx = Math.floor(Math.random() * pool.length);
    this.current = pool[idx];
    this.render();
  },

  // 绑定事件
  bindEvents() {
    document.getElementById('btnExpressionRefresh').addEventListener('click', () => {
      this.randomize();
    });
    document.getElementById('btnExpressionDone').addEventListener('click', () => {
      this.markDone();
    });
    document.getElementById('btnCopyDescription').addEventListener('click', () => {
      this.copyDescription();
    });
  },

  // 渲染物品
  render() {
    if (!this.current) return;

    // Emoji 展示区（用渐变背景 + 大号 emoji 代替不相关的随机图片）
    const wrap = document.getElementById('expressionImageWrap');
    wrap.style.background = this.current.bgGradient;
    document.getElementById('expressionEmoji').textContent = this.current.emoji;

    // 物品名称
    document.getElementById('expressionName').textContent =
      `${this.current.emoji} ${this.current.name}`;

    // 描述词
    document.getElementById('expressionDescription').textContent =
      this.current.description;

    // 表达方法
    const techHtml = this.current.techniques.map((t, i) =>
      `<div class="expression-technique">
        <span class="expression-technique-num">${i + 1}</span>
        <div class="expression-technique-body">
          <strong>${t.label}</strong>
          <span>${t.desc}</span>
        </div>
      </div>`
    ).join('');
    document.getElementById('expressionTechniques').innerHTML = techHtml;

    // 更新练习状态
    this.updateStatus();
  },

  // 更新今日练习状态
  updateStatus() {
    const badge = document.getElementById('expressionTodayBadge');
    const btn = document.getElementById('btnExpressionDone');

    if (this.todayRecord.practiced) {
      badge.textContent = '✅ 今日已练习';
      badge.className = 'expression-today-badge done';
      btn.textContent = '✅ 今日已完成';
      btn.classList.add('done');
      btn.disabled = true;
    } else {
      badge.textContent = '📋 今日待练习';
      badge.className = 'expression-today-badge';
      btn.textContent = '✅ 标记已练习';
      btn.classList.remove('done');
      btn.disabled = false;
    }
  },

  // 标记今日已练习
  markDone() {
    if (this.todayRecord.practiced) return;

    this.todayRecord.practiced = true;
    if (!this.todayRecord.items.includes(this.current.name)) {
      this.todayRecord.items.push(this.current.name);
    }
    this.saveToday();
    this.updateStatus();
    Helpers.showToast(`🎉 今日表达训练完成！「${this.current.name}」`, 'success', 3000);
  },

  // 复制描述词
  copyDescription() {
    const text = document.getElementById('expressionDescription').textContent;
    navigator.clipboard.writeText(text).then(() => {
      Helpers.showToast('📋 描述词已复制，粘贴到备忘录练习吧！', 'info', 2000);
    }).catch(() => {
      Helpers.showToast('复制失败，请手动选择文本', 'error');
    });
  },
};

// 暴露到全局
window.Expression = Expression;
