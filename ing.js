// pages/song/ing/ing.js
import * as Tool from "./tool"
import Toast from '@vant/weapp/toast/toast';


var global = getApp()
var d;
Page({
    /**
     * 页面的初始数据
     */
    lyrcStartScrollIndex: 4, //如果歌词超过该行数 就开始滚动
    data: {
        scrollTop: 0,
        scrollIntoView: "",
        isPlay: false,
        isPlayStatus: 0, //0 开始 1中途有过暂停 那么再开启就是继续录音
        lyricIndex: -1,
        lyrc: [],
        duration: "",
        currentTime: "00:00",
        progress: "0",
        isShowExitPopup: false,
        id: "",
        songTitle: "",
        songTime: "",
        skipEnd: "",
        skipEndStatus: false,
        isShowNotice: false,
        mode: 0,  //mode 0 普通模式 1活动模式
    },
    options: {},
    responseObj: {},
    skipEndClick: false,
    skipEndFn() {
        this.skipEndClick = true;
        this.refreshFn();
    },
    exitCancelFn() {
        this.setData({
            isShowExitPopup: false,
            skipEndStatus: false,
        })
    },
    selectModeFn(e) {
        // console.log(e.target.dataset.seq)
        global.mode.currentIndex = e.target.dataset.seq;
        this.onLoadFn();
        this.setData({
            isShowExitPopup: false
        })
    },
    exitSureFn() {
        wx.redirectTo({
            url: `/pages/activity/pages/product/product`
        })
    },
    getNoticeFn() {
        global.api.getSongMatter().then(resp => {
            if (resp.retSuccess) {
                console.log(resp)
                this.setData({
                    isShowNotice: !resp.data
                })
            } else {
                Toast(resp.retMessage);
            }
        })
    },
    noticeCloseFn() {
        global.api.saveSongMatter().then(resp => {
            if (resp.retSuccess) {
                this.setData({
                    isShowNotice: !this.data.isShowNotice
                })
            } else {
                Toast(resp.retMessage);
            }
        })
    },
    submitFn(songUrl) {
        let obj = global.mode.list[global.mode.currentIndex];

        global.api.saveSong({
            songId: this.data.id,
            url: this.getUrl(songUrl),
            duration: this.data.songTime,
            taskCode: 'song',
            singType: obj.status //singType  0 一般任务 1模拟练习 2正式录制
        }).then(resp => {
            if (resp.retSuccess) {
                //活动-正式录制
                if (obj.status == 2) {
                    Toast("录制成功!")
                    setTimeout(() => {
                        wx.redirectTo({
                            url: "/pages/activity/pages/product/product"
                        })
                    }, 500)
                }
                //一般活动
                if (obj.status == 0) {
                    wx.redirectTo({
                        url: "../result/result"
                    })
                }
            } else {
                Toast(resp.retMessage);
            }
        })
    },
    refreshFn() {
        this.innerAudioContext.stop();
        this.recorderManager.stop();

        setTimeout(() => {
            this.setData({
                scrollIntoView: "lyrc_0",
                lyricIndex: -1,
                currentTime: "00:00",
                progress: "0",
                isPlay: false,
                isPlayStatus: 0, //0 开始 1中途有过暂停 那么再开启就是继续录音
            })
        }, 500)
    },
    tapFn() {
        this.setData({
            isPlay: !this.data.isPlay
        })
        if (this.data.isPlay) {
            this.play();
            if (this.data.isPlayStatus == 1) {
                this.recorderManager.resume();
            } else {
                this.recorderManager.start({
                    duration: 600000,//指定录音的时长，单位 ms
                    sampleRate: 44100,
                    numberOfChannels: 2,
                    encodeBitRate: 192000,
                    format: 'mp3',
                    frameSize: 50
                });
            }
        } else {
            this.pause();
            this.setData({
                isPlayStatus: 1
            })
        }
    },
    play() {
        this.innerAudioContext.play();

        this.innerAudioContext.onTimeUpdate(() => {
            console.log('进度更新了总进度为：' + this.innerAudioContext.duration + '当前进度为：' + this.innerAudioContext.currentTime);

            var progress = 0;
            let currentTime = this.innerAudioContext['currentTime'];
            let duration = this.innerAudioContext['duration'];

            if (currentTime + 0.2 >= duration) {
                progress = 100;
            } else {
                progress = ((currentTime / duration) * 100).toFixed(2);
            }
            this.setData({
                currentTime: Tool.formatSeconds(this.innerAudioContext.currentTime),
                progress,
                skipEndStatus: this.innerAudioContext.currentTime >= this.data.skipEnd ? true : false
            })
            this.data.lyrc.forEach((i, index) => {
                if (this.innerAudioContext.currentTime >= i.time && this.data.lyricIndex < (index + 1)) {
                    this.setData({
                        lyricIndex: index,
                    })
                }
            })
        })
    },
    pause() {
        this.innerAudioContext.pause();
        this.recorderManager.pause();
    },
    watch: {
        lyricIndex: function (newVal, oldVal) {
            if (newVal != oldVal) {
                let diff = newVal - this.lyrcStartScrollIndex;
                setTimeout(() => {
                    this.setData({
                        scrollIntoView: diff < 0 ? 'lyrc_0' : 'lyrc_' + diff
                    })
                })
            }
        }
    },
    getUrl(url) {
        if (url.includes('s3_token')) {
            const str = url.match(/s3_token=(\S*)&chicS3/)[1]
            return url.replace(str, 'A')
        }
        return url
    },
    init() {
        this.innerAudioContext = wx.createInnerAudioContext();
        this.innerAudioContext.volume = 1;

        this.innerAudioContext.onPause(() => {
            console.log('innerAudioContext onPause')
            this.setData({
                isPlay: false,
            })
            this.recorderManager.pause();
        })
        this.innerAudioContext.onPlay(() => {
            Toast.clear();
            console.log('innerAudioContext onPlay')
            this.setData({
                isPlay: true
            })
            this.recorderManager.resume();
        })


        this.innerAudioContext.onEnded(() => {
            this.recorderManager.stop();
            this.innerAudioContext.stop();
        })

        this.recorderManager = wx.getRecorderManager();
        this.recorderManager.onError(err => {
            console.log(err)
        })
        this.recorderManager.onStop(async (res) => {
            if (this.data.progress > 98 || this.skipEndClick) {
                //模拟练习录音不录入后台
                //正式练习和一般任务录入后台
                let obj = global.mode.list[global.mode.currentIndex];

                if (obj.status == 1) {
                    this.refreshFn();
                    this.setData({
                        isShowExitPopup: true
                    })
                    return
                }
                console.log('recorder stop', res)
                const { tempFilePath } = res

                Toast.loading({
                    message: '录音上传中...',
                    forbidClick: true,
                    duration: 0
                });
                //res {tempFilePath: "http://tmp/6RFyHwYoCtP6c09cbaa4b3c2c8386070aac9568ccf5b.durationTime=7148.mp3", fileSize: 60456, duration: 7148}
                const slit = tempFilePath.split(".");
                const fileName = global.globalData.user_id + '_' + new Date() * 1 + "." + slit[slit.length - 1]
                const base64 = wx.getFileSystemManager().readFileSync(tempFilePath, 'base64')
                console.log(base64)
                global.api.awsUpload({
                    data: base64,
                    objectName: "whale/patient/" + fileName,
                    appId: ''
                }).then(resp => {
                    if (resp.success) {
                        let url = `${global.api.locationUrl}/patient${resp.data.path}` //发给后端的地址
                        console.log('url', url)
                        this.submitFn(url);
                    } else {
                        Toast(resp.retMessage);
                    }
                })

                // try {
                // 	const request = {
                // 		key: "whale/patient/" + fileName,
                // 		filePath: tempFilePath
                // 	}
                // 	const res = await upLoadFile(request)
                // 	Toast.clear();

                // 	const objectName = `objectName=${request.key}`
                // 	const cryptoData = CryptoJS.encrypt(objectName)
                // 	let url = `${global.api.locationUrl}/patient/oss/getTempUrl/redirect/${fileName}?data=${cryptoData}` //发给后端的地址
                // 	this.submitFn(url);

                // } catch (err) {
                // 	console.log(err)
                // 	Toast(err);
                // }
            }
        })
        global.api.songDetail({
            songId: this.data.id
        }).then(resp => {
            if (resp.retSuccess) {
                let res = resp.data;

                if (global.mode.list[global.mode.currentIndex]['modeName'].includes("original")) {
                    this.innerAudioContext['src'] = encodeURI(res.songUrl);
                } else {
                    this.innerAudioContext['src'] = encodeURI(res.accompany);
                }

                this.responseObj = res;
                d = setInterval(() => {
                    if (this.innerAudioContext['duration']) {
                        clearInterval(d)
                        this.setData({
                            duration: Tool.formatSeconds(this.innerAudioContext['duration']),
                            skipEnd: res.skipEnd
                        })
                    }
                }, 200)

                let lyrc = JSON.parse(res.lyric)
                lyrc.forEach(i => {
                    i.time = parseFloat(i.time.substr(0, 2)) * 60 + parseFloat(i.time.substring(3, 5)) - 0.1;
                })
                this.setData({
                    lyrc,
                    songTime: res.time
                })
            } else {
                Toast(resp.retMessage);
            }
        })
    },

    onLoadFn() {
        //mode 0 普通模式 1活动模式
        let currentIndex = global.mode.currentIndex

        wx.setNavigationBarTitle({
            title: global.mode.list[currentIndex]['title']
        })
        this.setData({
            songTitle: this.options.songTitle,
            id: this.options.id,
            mode: global.mode.list[currentIndex]['type']
        })
        this.getNoticeFn();
        wx.setKeepScreenOn({
            keepScreenOn: true
        })
        this.init();
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        Tool.setWatcher(this); // 设置监听器，建议在onLoad下调用
        this.options = options;
        this.onLoadFn();
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {
    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () {
    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function () {
        console.log('hide')
    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {
        console.log('onUnload')
        this.innerAudioContext.destroy();
        this.recorderManager.stop();

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh: function () {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom: function () {

    },

    /**
  * 用户点击右上角分享
  */
    onShareAppMessage: function (options) {

    }
})