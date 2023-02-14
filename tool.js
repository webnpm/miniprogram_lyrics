/**
 * 设置监听器
 */
export function setWatcher(page) {
    let data = page.data;
    let watch = page.watch;
    Object.keys(watch).forEach(v => {
        let key = v.split('.'); // 将watch中的属性以'.'切分成数组
        let nowData = data; // 将data赋值给nowData
        for (let i = 0; i < key.length - 1; i++) { // 遍历key数组的元素，除了最后一个！
            nowData = nowData[key[i]]; // 将nowData指向它的key属性对象
        }
        let lastKey = key[key.length - 1];
        // 假设key==='my.name',此时nowData===data['my']===data.my,lastKey==='name'
        let watchFun = watch[v].handler || watch[v]; // 兼容带handler和不带handler的两种写法
        let deep = watch[v].deep; // 若未设置deep,则为undefine
        observe(nowData, lastKey, watchFun, deep, page); // 监听nowData对象的lastKey
    })
}
/**
 * 监听属性 并执行监听函数
 */
export function observe(obj, key, watchFun, deep, page) {
    var val = obj[key];
    // 判断deep是true 且 val不能为空 且 typeof val==='object'（数组内数值变化也需要深度监听）
    if (deep && val != null && typeof val === 'object') {
        Object.keys(val).forEach(childKey => { // 遍历val对象下的每一个key
            observe(val, childKey, watchFun, deep, page); // 递归调用监听函数
        })
    }
    let that = this;
    Object.defineProperty(obj, key, {
        configurable: true,
        enumerable: true,
        set: function (value) {
            watchFun.call(page, value, val); // value是新值，val是旧值
            val = value;
            if (deep) { // 若是深度监听,重新监听该对象，以便监听其属性。
                observe(obj, key, watchFun, deep, page);
            }
        },
        get: function () {
            return val;
        }
    })
}

/**
 * 格式化秒
 * e.g 00:30 , 10:20
 * @param int|string  value 总秒数
 * @return string result 格式化后的字符串
 */
export function formatSeconds(value) {
    
    var second = Math.floor(value); // 需要转换的时间秒 
    var minute = 0; // 分 
    if (second > 60) {
        minute = parseInt(second / 60);
        second = parseInt(second % 60);
        if (minute > 60) {
            minute = parseInt(minute % 60);
        }
    }
    if(minute < 10){
        minute = "0"+ minute
    }
    if(second < 10){
        second = "0"+ second
    }
    
    return minute + ":" +second;
}

/**
 * 数字千分符
 * e.g 11000.00 => 11,000.00
 * @param int|string  money 数值
 * @return string result 千分符后的字符串
*/
export function fmoney(money){
    let s = ""+money
    if (!isNaN(s)) {
         var l = s.split(".")[0].split("").reverse(), r = s.indexOf(".") >= 0 ? "."
                 + s.split(".")[1]
                 : "";
         var t = "";
         for (var i = 0; i < l.length; i++) {
             t += l[i] + ((i + 1) % 3 == 0 && (i + 1) != l.length ? "," : "");
         }
         return t.split("").reverse().join("") + r;

     } else {
         return s;
     }
}
/**
 * 去除数字千分符
 * e.g 11,000.00 => 11000.00 
 * @param int|string  money 数值
 * @return boolean result 千分符后的数字
*/
export function rmoney(s){
   return parseFloat(s.replace(/[^\d\.-]/g, ""));
}