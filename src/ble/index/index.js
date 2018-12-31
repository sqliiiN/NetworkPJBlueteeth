const app = getApp()

// 需要用到的 UUIDs
var reserveduuid = {
  // 自定义蓝牙uuid
  target_uuid: "00B14C5D-AD30-8262-895F-CBFC46278D9C",
  // 电池
  battery_uuid: "00002A19-0000-1000-8000-00805F9B34FB",
  // 温湿度传感器
  sensor_uuid: "0000FFF6-0000-1000-8000-00805F9B34FB",
};

function inArray(arr, key, val) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i][key] === val) {
      return i;
    }
  }
  return -1;
}

// 16进制字符串转10进制
function hex2dec(hex, start) {
  let dec = 0;
  let base = 1;
  for (let i = 1; i >= 0; i--) {
    if (i < 1) base *= 16;
    if (hex[start + i] >= '0' && hex[start + i] <= '9') {
      dec = dec + (hex[start + i] - '0') * base;
    } else {
      dec = dec + (hex[start + i] - 'a') * base;
    }
  }
  return dec.toString();
}

// ArrayBuffer转16进度字符串
function ab2hex(buffer) {
  var hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    function (bit) {
      return ('00' + bit.toString(16)).slice(-2)
    }
  )
  return hexArr.join('');
}


Page({
  data: {
    devices: [],
    connected: false,
    chs: [],

    // 蓝牙设备传输到手机上的信息
    // 电池电量
    batterylev: null,
    // 温度整数和小数位
    temperature_high: null,
    temperature_low: null,
    // 湿度整数和小数位
    humidity_high: null,
    humidity_low: null,
  },

  /** 
   * 
   * openBluetoothAdapter: 开启蓝牙适配器后，搜索附近蓝牙设备.
   *    1. 蓝牙适配器开启成功, 开始搜寻附近的蓝牙外围设备;
   *    2. 蓝牙适配器开启失败, 监听蓝牙适配器的变化;
   *    3. 一旦蓝牙适配器可用, 开始搜寻附近的蓝牙外围设备.
   */
  openBluetoothAdapter() {
    wx.openBluetoothAdapter({
      success: (res) => {
        console.log('openBluetoothAdapter success', res)
        this.startBluetoothDevicesDiscovery()
      },
      fail: (res) => {
        if (res.errCode === 10001) {
          wx.onBluetoothAdapterStateChange(function (res) {
            console.log('onBluetoothAdapterStateChange', res)
            if (res.available) {
              this.startBluetoothDevicesDiscovery()
            }
          })
        }
      }
    })
  },

  /** 
   * 
   * getBluetoothAdapterState: 获取本机蓝牙适配器状态.
   *    1. discovering (正在搜索设备) -> 监听寻找到新设备的事件
   *    2. available (蓝牙适配器是否可用) -> 开始搜寻附近的蓝牙外围设备
   */
  getBluetoothAdapterState() {
    wx.getBluetoothAdapterState({
      success: (res) => {
        console.log('getBluetoothAdapterState', res)
        if (res.discovering) {
          this.onBluetoothDeviceFound()
        } else if (res.available) {
          this.startBluetoothDevicesDiscovery()
        }
      }
    })
  },

  /** 
   * 
   * startBluetoothDevicesDiscovery: 开始搜寻附近的蓝牙外围设备.
   *    1. 如果已经在搜索, 直接返回
   *    2. 如果没有, 将标志设置成true, 并开始搜寻附近的蓝牙外围设备
   */
  startBluetoothDevicesDiscovery() {
    if (this._discoveryStarted) {
      return
    }
    this._discoveryStarted = true
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: true,
      success: (res) => {
        console.log('startBluetoothDevicesDiscovery success', res)
        this.onBluetoothDeviceFound()
      },
    })
  },

  /** 
   * 
   * stopBluetoothDevicesDiscovery: 停止搜寻附近的蓝牙外围设备.
   */
  stopBluetoothDevicesDiscovery() {
    wx.stopBluetoothDevicesDiscovery()
  },

  /** 
   * 
   * onBluetoothDeviceFound: 监听寻找到新设备的事件.
   * 存储并显示所有的设备信息, 同步改变视图
   */
  onBluetoothDeviceFound() {
    wx.onBluetoothDeviceFound((res) => {
      res.devices.forEach(device => {
        //if (!device.name && !device.localName) {
        //return
        //}
        const foundDevices = this.data.devices
        const idx = inArray(foundDevices, 'deviceId', device.deviceId)
        const data = {}
        if (idx === -1) {
          data[`devices[${foundDevices.length}]`] = device
        } else {
          data[`devices[${idx}]`] = device
        }
        this.setData(data)
      })
    })
  },

  /** 
   * 
   * createBLEConnection: 建立BLE连接.
   *    1. 获取设备ID与设备名name
   *    2. 如果连接建立成功, 调用getBLEDeviceServices获取服务
   *    3. 停止蓝牙设备发现(保持搜索状态耗能，一旦建立连接就关闭)
   */
  createBLEConnection(e) {
    const ds = e.currentTarget.dataset
    const deviceId = ds.deviceId
    const name = ds.name
    wx.createBLEConnection({
      deviceId,
      success: (res) => {
        this.setData({
          connected: true,
          name,
          deviceId,
        })
        this.getBLEDeviceServices(deviceId)
      }
    })
    this.stopBluetoothDevicesDiscovery()
  },

  /** 
   * 
   * closeBLEConnection: 关闭BLE连接.
   */
  closeBLEConnection() {
    wx.closeBLEConnection({
      deviceId: this.data.deviceId
    })
    this.setData({
      connected: false,
      chs: [],
      canWrite: false,
    })
  },

  /** 
   * 
   * getBLEDeviceServices: 获取蓝牙设备所有服务.
   *    如果成功获得设备服务, 
   *    调用getBLEDeviceCharacteristics获取服务的特征值
   */
  getBLEDeviceServices(deviceId) {
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        for (let i = 0; i < res.services.length; i++) {
          if (res.services[i].isPrimary) {
            this.getBLEDeviceCharacteristics(deviceId, res.services[i].uuid)
          }
        }
      }
    })
  },

  /** 
   * 
   * getBLEDeviceCharacteristics: 获取服务的特征值并监听特征值变化事件.
   *    调用API时需要设备ID和服务ID
   *    1. 如果调用成功, 调用getBLEDeviceCharacteristics获取服务的特征值
   *      1.1 read(可读) -> readBLECharacteristicValue: 读取低功耗蓝牙设备的特征值的二进制数据值
   *      1.2 write(可写) -> 参数赋值
   *      1.3 notify | indicate (通知|指示) -> 订阅特征值
   */
  getBLEDeviceCharacteristics(deviceId, serviceId) {
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: (res) => {
        console.log('getBLEDeviceCharacteristics success', res.characteristics)
        for (let i = 0; i < res.characteristics.length; i++) {
          let item = res.characteristics[i]
          if (item.properties.read) {
            wx.readBLECharacteristicValue({
              deviceId,
              serviceId,
              characteristicId: item.uuid,
            })
          }
          /**if (item.properties.write) {
            this.setData({
              canWrite: true
            })
            this._deviceId = deviceId
            this._serviceId = serviceId
            this._characteristicId = item.uuid
            this.writeBLECharacteristicValue()
          }*/
          if (item.properties.notify || item.properties.indicate) {
            wx.notifyBLECharacteristicValueChange({
              deviceId,
              serviceId,
              characteristicId: item.uuid,
              state: true,
            })
          }
        }
      },
      fail(res) {
        console.error('getBLEDeviceCharacteristics', res)
      }
    })
    // 操作之前先监听，保证第一时间获取数据
    wx.onBLECharacteristicValueChange((characteristic) => {
      const idx = inArray(this.data.chs, 'uuid', characteristic.characteristicId)
      const data = {}
      if (idx === -1) {
        data[`chs[${this.data.chs.length}]`] = {
          uuid: characteristic.characteristicId,
          value: ab2hex(characteristic.value)
        }
        // 获取蓝牙设备信息
        //
        if (deviceId === reserveduuid["target_uuid"]) {
          // 电池信息
          //
          if (data[`chs[${this.data.chs.length}]`].uuid === reserveduuid.battery_uuid) {
            data.batterylev = hex2dec(data[`chs[${this.data.chs.length}]`].value, 0)
          }
          // 传感器信息
          //
          else if (data[`chs[${this.data.chs.length}]`].uuid === reserveduuid.sensor_uuid) {
            data.temperature_low = hex2dec(data[`chs[${this.data.chs.length}]`].value, 6)
            data.temperature_high = hex2dec(data[`chs[${this.data.chs.length}]`].value, 4)
            data.humidity_low = hex2dec(data[`chs[${this.data.chs.length}]`].value, 2)
            data.humidity_high = hex2dec(data[`chs[${this.data.chs.length}]`].value, 0)
          }
        }
      } else {
        data[`chs[${idx}]`] = {
          uuid: characteristic.characteristicId,
          value: ab2hex(characteristic.value)
        }
        // 获取蓝牙设备信息
        //
        if (deviceId === reserveduuid["target_uuid"]) {
          // 电池信息
          //
          if (data[`chs[${idx}]`].uuid === reserveduuid.battery_uuid) {
            data.batterylev = hex2dec(data[`chs[${idx}]`].value, 0)
          }
          // 传感器信息
          //
          else if (data[`chs[${idx}]`].uuid === reserveduuid.sensor_uuid) {
            data.temperature_low = hex2dec(data[`chs[${idx}]`].value, 6)
            data.temperature_high = hex2dec(data[`chs[${idx}]`].value, 4)
            data.humidity_low = hex2dec(data[`chs[${idx}]`].value, 2)
            data.humidity_high = hex2dec(data[`chs[${idx}]`].value, 0)
          }
        }
      }
      this.setData(data)
    })
  },

  /** 
   * 
   * closeBluetoothAdapter: 关闭适配器.
   */
  closeBluetoothAdapter() {
    wx.closeBluetoothAdapter()
    this._discoveryStarted = false
  },

  /** 
   * 
   * cleanupData: 关闭适配器.
   */
  cleanupData() {
    this.setData({
      devices: [],
      connected: false,
      chs: [],

      // 蓝牙设备传输到手机上的信息
      // 电池电量
      batterylev: null,
      // 温度整数和小数位
      temperature_high: null,
      temperature_low: null,
      // 湿度整数和小数位
      humidity_high: null,
      humidity_low: null,
      })
  },
})