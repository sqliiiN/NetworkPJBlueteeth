### 蓝牙
参考资料 Blueteeth Essentials for Programmers

## 蓝牙简介

* Bluetooth is a way for devices to wirelessly communicate over short distances. Wireless communication has been around since the late nineteenth century, and has taken form in radio, infrared, television, and more recently 802.11. What distinguishes Bluetooth is its special attention to short-distance com- munication, usually less than 30 ft. Both hardware and software are affected by this special attention. 

* 蓝牙是设备短距离无线通信的一种方式。自19世纪后期以来，无线通信已经出现，并且已经在无线电、红外线、电视以及最近的802.11中形成。 蓝牙的区别在于它对短距离通信的特别关注，通常不超过10米。

## 802.11

## 从编程者的角度理解蓝牙
* 重点问题：我们如何创建连接两个蓝牙设备并在它们之间传输数据的程序

## 蓝牙建立连接 OUTGOING/INGOING
# 与互联网TCP/IP协议进行对比
* 与网络编程对比
    1. 蓝牙向外建立连接
        * 搜索附近的设备
        * 询问设备的display name
        * 用user-specified的名字选择一个设备
        * 硬编码的协议 RFCOMM, L2CAP, or SCO】
        * 搜索目标设备以查找与预定义标识符（例如UUID，name等）匹配的SDP记录
        * 选择端口号
        * socket() connect()
        * send() recv()
        * close()
    2. 蓝牙处理外部的连接
        * 硬编码的协议
        * 选择端口号
        * 绑定并监听
        * 用本地SDP服务器广告服务
        * 监听接收
        * 发送接收数据
        * 关闭连接

# 选择一个目标设备
* 制造的每个蓝牙芯片都印有 **全球唯一的48位地址，称为蓝牙地址或设备地址。** 这在性质上与以太网的机器地址代码（MAC）地址相同。**实际上，两个地址空间都由同一组织管理 -  IEEE注册机构。** 这些蓝牙地址在制造时分配，旨在保持独特性，并在芯片的生命周期内保持静止。它可以方便地作为所有蓝牙编程中的基本寻址单元。要使一个蓝牙设备与另一个蓝牙设备通信，它必须有某种方法来确定其他设备的蓝牙地址。该地址 **用于蓝牙通信过程的所有层，从低级无线电协议到更高级别的应用协议。** 相反，使用以太网的TCP/IP网络设备在通信过程的较高层丢弃48位MAC地址并切换到使用IP地址。然而，原理保持不变，因为必须知道目标设备的唯一识别地址才能与之通信。客户端可能对这种目标地址一无所知。例如在在因特网编程中，用户通常知道或提供主机名，然后必须通过DNS将其转换为物理IP地址。在蓝牙中，用户通常会提供一些 **用户友好的名称** ，例如“我的电话”，并且客户端通过搜索附近的蓝牙设备并检查每个设备的名称将其转换为数字地址。
    **用户友好的名称** 与DNS相反，设备会先搜索附近的设备地址，再向设备询问用户友好的设备名称。

# 设备发现 地址与类别
* 设备发现，也称为设备查询，是搜索和检测附近蓝牙设备的过程。理论上很简单：要弄清楚附近有什么， **广播“发现”消息并等待回复。每个回复包括响应设备的地址和标识设备的一般类别的整数（例如，手机，台式PC，耳机等）**。然后，可以通过单独联系每个设备来获取更详细的信息，例如设备名称。

# 可发现性和可连接性
出于隐私和电源问题，所有蓝牙设备都有两个选项，用于确定设备是否响应设备查询和连接尝试。 “查询扫描”选项控制前者，“页面扫描”选项控制后者。
* Inquiry Scan  设备是否可被发现
* Page Scan     是否可连接

# 选择一个传输协议
* RFCOMM - TCP
* L2CAP - UDP 尽力而为的服务
* 蓝牙规范定义了四种主要的传输协议。 其中，RFCOMM往往是最佳选择，有时也是唯一的选择。 L2CAP也是一种广泛使用的传输协议，在不需要RFCOMM的流媒体特性时使用。

# 端口号
* 蓝牙协议只有30个端口
* 保留端口 例如，服务发现协议（SDP）使用端口1，RFCOMM连接在L2CAP端口3上复用。RFCOMM没有任何保留端口。

# 服务发现协议
