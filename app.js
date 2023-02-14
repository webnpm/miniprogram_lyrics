import api from './api/api.js'

// app.js
const circTime = 5000
var d = null
var arr = [];
var arr_index = 0;
App({
    onLaunch() {
        this.overShare();
        wx.setInnerAudioOption({
            mixWithOther: false,
            obeyMuteSwitch: false,
        })
    },
    onShow() {
        console.log(this.globalData.systemInfo);
    },
    eventLoop() {
        if (d) return;
        d = setInterval(() => {
            var pages = getCurrentPages();
            var currentPage = pages[pages.length - 1];
            //behavior注入到页面 
            if (currentPage.data.isShowSong === false) {
                this.api.eventLoop().then(res => {
                    if (res.data.length == 0) return;
                    currentPage.setData({
                        isShowSong: true,
                        credit: res.data[0]['credit'],
                        message: res.data[0]['message'],
                    })
                })
            }

        }, this.globalData.circulationTime);
    },
    startEventLoop() {
        this.eventLoop();
    },
    //重写分享方法
    overShare: function () {
        //监听路由切换
        //间接实现全局设置分享内容
        wx.onAppRoute(function (res) {
            //获取加载的页面
            //isOverShare true 保持页面中的分享 false 覆盖页面中的分享
            let pages = getCurrentPages(),
                //获取当前页面的对象
                view = pages[pages.length - 1],
                data;
            // console.log(view)
            if (view) {
                data = view.data;
                console.log('是否重写分享方法', data.isOverShare);
                if (!data.isOverShare) {
                    data.isOverShare = true;
                    view.onShareAppMessage = function () {
                        return {
                            path: '/pages/common/default/default'
                        };
                    }
                }
            }
        })
    },

    globalData: {
        userInfo: null,
        systemInfo: wx.getSystemInfoSync(),
        opendId: "",
        session_key: "",
        phoneNumber: "",
        circulationTime: circTime,
        activity: "", //activity 活动tab 0 普通 1 活动
        customerServiceCode: "",//1v1 聊天
        nickName: "",
        avatarUrl: "",
        user_id: "" //用户id
    },
    /**
     * mode
     * modeName e.g
     * normal_accompaniment 普通模式-伴唱
     * simulation_accompaniment 模拟-伴唱
     * simulation_original 模拟-原声
     * gold_accompaniment 正式录制-伴唱
     * 
     * status 0 一般任务 1模拟练习 2正式录制 (同步后端字端singType)
    */
    mode: {
        currentIndex: 0,
        list: [{
            seq: 0,
            name: "普通模式-伴唱",
            title: "演唱",
            type: "normal",
            modeName: "normal_original",
            status: "0",
        },
        {
            seq: 1,
            name: "模拟-原声",
            title: "模拟练习（原唱）",
            type: "activity",
            modeName: "simulation_original",
            status: "1",
        },
        {
            seq: 2,
            name: "模拟-伴唱",
            title: "模拟练习（伴唱）",
            type: "activity",
            modeName: "simulation_accompaniment",
            status: "1",
        },
        {
            seq: 3,
            name: "正式录制-伴唱",
            title: "歌曲录制",
            type: "activity",
            modeName: "gold_accompaniment",
            status: "2",
        }]
    },
    config: {
        status: {
            'INIT': 1, // 报名
            'SIGN_UP': 2, //上传
            'AUDIT_NOT_PASS': 3, //审核失败
            'UPLOAD_WORKS': 4, //上传审核
            'AUDIT_PASS': 5, //审核成功
            'LEARNED': 6 //患教内容学习
        }
    },
    api: new api()
})