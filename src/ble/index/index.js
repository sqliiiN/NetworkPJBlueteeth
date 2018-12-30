const app = getApp()

function inArray(arr, key, val) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i][key] === val) {
      return i;
    }
  }
  return -1;
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
  },

  /** 
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
   * stopBluetoothDevicesDiscovery: 停止搜寻附近的蓝牙外围设备.
   */
  stopBluetoothDevicesDiscovery() {
    wx.stopBluetoothDevicesDiscovery()
  },

  /** 
   * onBluetoothDeviceFound: 监听寻找到新设备的事件.
   * 存储并显示所有的设备信息, 同步改变视图
   */
  onBluetoothDeviceFound() {
    wx.onBluetoothDeviceFound((res) => {
      res.devices.forEach(device => {
        if (!device.name && !device.localName) {
          return
        }
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
            return
          }
        }
      }
    })
  },

  /** 
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
          if (item.properties.write) {
            this.setData({
              canWrite: true
            })
            this._deviceId = deviceId
            this._serviceId = serviceId
            this._characteristicId = item.uuid
            this.writeBLECharacteristicValue()
          }
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
      } else {
        data[`chs[${idx}]`] = {
          uuid: characteristic.characteristicId,
          value: ab2hex(characteristic.value)
        }
      }
      this.setData(data)
    })
  },

  /** 
   * writeBLECharacteristicValue: 向低功耗蓝牙设备特征值中写入二进制数据.
   *    写数据需要有下列参数
   *      设备ID, 服务ID, 特征值, 缓冲区
   */
  writeBLECharacteristicValue() {
    // 向蓝牙设备发送一个0x00的16进制数据
    let buffer = new ArrayBuffer(1)
    let dataView = new DataView(buffer)
    dataView.setUint8(0, Math.random() * 255 | 0)
    wx.writeBLECharacteristicValue({
      deviceId: this._deviceId,
      serviceId: this._serviceId,
      characteristicId: this._characteristicId,
      value: buffer,
    })
  },

  /** 
   * closeBluetoothAdapter: 关闭适配器.
   */
  closeBluetoothAdapter() {
    wx.closeBluetoothAdapter()
    this._discoveryStarted = false
  },
})
