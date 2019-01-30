import React, { Component } from 'react';
import { Platform, View, Text, Dimensions } from 'react-native';
import {BleManager, LogLevel} from 'react-native-ble-plx';
import { PermissionsAndroid } from 'react-native';
import { Read as HrsRead, Store as HrsStore } from "./HRS";
import { Read as EdaRead, Store as EdaStore } from "./EDA";
import { IndicatorViewPager, PagerTitleIndicator} from 'rn-viewpager';
import { ConvertData as EdaConverter } from './EDA';
import { ConvertData as HrsConverter } from './HRS';
import { Chart } from './Chart';
import { Button } from 'react-native';

function requestCoarseLocationPermission() {
  const enabled = PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION)
  if (!enabled) {
    console.log("Permission not enabled");
    const granted = PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION)
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      console.error("Didn't get permission")
    } else {
      console.log("permission granted")
    }
  } else {
    console.log("permission granted")
  }
}

export default class App extends Component {
  constructor() {
    super();
    requestCoarseLocationPermission();
    this.manager = new BleManager();
    console.log("BLE manager started");

    this.state = {
      info: "",
      values: {},
      chartData: {HRS: [{x: new Date(), y: 0},{x: new Date(), y: 0}], EDA: [{x: new Date(), y: 0},{x: new Date(), y: 0}]},
    };

    this.characteristics = {
      "EDA": {
        service: "0000fdb7-0000-1000-8000-00805f9b34fb",
        characteristic: "0000fdb8-0000-1000-8000-00805f9b34fb",
        conversion: EdaConverter,
      },
      "HRS": {
        service: "0000180d-0000-1000-8000-00805f9b34fb",
        characteristic: "00002a37-0000-1000-8000-00805f9b34fb",
        conversion: HrsConverter,
      }
    };
  }

  info(message) {
    this.setState({info: message})
  }

  error(message) {
    this.setState({info: "ERROR: " + message})
  }

  updateValue(key, value) {
      console.log("updatevalue", key, value)
    this.setState({values: {...this.state.values, [key]: value}});

    this.setState({chartData: {...this.state.chartData, [key]: this.state.chartData[key].concat([{x: new Date(), y: value}]) } });
      if (this.state.chartData[key].length > 60) {
          this.setState({ chartData: {...this.state.chartData, [key]: this.state.chartData[key].slice(1) }})
      }
  }

  componentWillMount() {
    if (Platform.OS === 'ios') {
      this.manager.onStateChange((state) => {
        if (state === 'PoweredOn') this.scanAndConnect()
      })
    } else {
      this.scanAndConnect()
    }
      this.manager.onStateChange((state) => {
        console.log("ble state change:", state)
      })
  }

  scanAndConnect() {
    this.manager.startDeviceScan(null,
        {ScanMode: "LowLatency"}, (error, device) => {
          this.info("Scanning...");
          // console.log("Found", device.name)

          if (error) {
              console.log(error);
            this.error("Got error: "+ error.message);
            return
          }

          if (device.name === 'EDA') {
            this.info("Connecting to EDA");
            // console.log("Connected to:", device)
            this.manager.stopDeviceScan();
            device.connect()
                .then((device) => {
                  this.info("Discovering services and characteristics");
                  return device.discoverAllServicesAndCharacteristics()
                })
                .then((device) => {
                  this.info("Setting notifications");
                  return this.setupNotifications(device)
                })
                .then(() => {
                  this.info("Listening...")
                }, (error) => {
                  this.error(error.message)
                })
          }
        });
  }

  async setupNotifications(device) {
    for (const uuid in this.characteristics) {
        console.log("Setting up notifs", device)
      device.monitorCharacteristicForService(this.characteristics[uuid].service, this.characteristics[uuid].characteristic, (error, characteristic) => {
          console.log("monitorCharacteristicForService:", error, characteristic)
          if (error !== null) {
              this.scanAndConnect()
          }
        this.updateValue(uuid, this.characteristics[uuid].conversion(characteristic.value))
      })
    }
  }

  render() {
      return(
        <View style={{flex:1}}>
            <EdaStore datetime={new Date().getTime()} data={this.state.values["EDA"]}/>
            <HrsStore datetime={new Date().getTime()} data={this.state.values["HRS"]}/>

            <IndicatorViewPager
                style={{height:Dimensions.get('window').height - 20, backgroundColor:'#263238'}}
                indicator={this._renderIndicator()}
            >
                <View>
                    <Text style={{color: '#ECEFF1'}}>{this.state.info}</Text>
                    <Button title="connect" onPress={this.scanAndConnect.bind(this)}></Button>
                </View>
                <View>
                    <Chart data={[this.state.chartData["HRS"], this.state.chartData["EDA"]]} />
                </View>
            </IndicatorViewPager>
        </View>
      )
  }

  _renderIndicator() {
      return <PagerTitleIndicator
          // style = {{ backgroundColor: '#546E7A' }}
          titles = {['Info', 'Graph']}
      />;
  }
}
