import React, { Component } from 'react';
import { Platform, View, Text, Dimensions } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { PermissionsAndroid } from 'react-native';
import { HrsComponent, Store as HrsStore } from "./HRS";
import { EdaComponent, Store as EdaStore } from "./EDA";
import {PagerTabIndicator, IndicatorViewPager, PagerTitleIndicator, PagerDotIndicator} from 'rn-viewpager';


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

export default class SensorsComponent extends Component {
  constructor() {
    super();
    requestCoarseLocationPermission();
    this.manager = new BleManager();
    console.log("BLE manager started");
    this.state = {
      index: 0,
      routes: [
        { key: 'info', title: 'Info' },
        { key: 'live', title: 'Live' },
        // { key: 'Historical', title: 'Historical' },
      ],
      info: "",
      values: {}}
    ;
    this.uuids = {
      "EDA": {
        service: "0000fdb7-0000-1000-8000-00805f9b34fb",
        characteristic: "0000fdb8-0000-1000-8000-00805f9b34fb",
      },
      "HRS": {
        service: "0000180d-0000-1000-8000-00805f9b34fb",
        characteristic: "00002a37-0000-1000-8000-00805f9b34fb",
      }
    };

    this.Live = () => (
        <View style={[styles.scene, { backgroundColor: '#fbffae' }]} >
          <HrsComponent data={this.state.values["HRS"]}/>
          <EdaComponent data={this.state.values["EDA"]}/>
        </View>
    );
  }

  info(message) {
    this.setState({info: message})
  }

  error(message) {
    this.setState({info: "ERROR: " + message})
  }

  updateValue(key, value) {
    this.setState({values: {...this.state.values, [key]: value}})
  }

  componentWillMount() {
    if (Platform.OS === 'ios') {
      this.manager.onStateChange((state) => {
        if (state === 'PoweredOn') this.scanAndConnect()
      })
    } else {
      this.scanAndConnect()
    }
  }

  scanAndConnect() {
    this.manager.startDeviceScan(null,
        {ScanMode: "LowLatency"}, (error, device) => {
          this.info("Scanning...");
          // console.log("Found", device.name)

          if (error) {
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
    for (const uuid in this.uuids) {
      device.monitorCharacteristicForService(this.uuids[uuid].service, this.uuids[uuid].characteristic, (error, characteristic) => {
        this.updateValue(uuid, characteristic.value)
      })
    }
  }

  render() {
      return(
        <View style={{flex:1}}>
            <EdaStore datetime={Math.round((new Date()).getTime() / 1000)} data={this.state.values["EDA"]}/>
            <HrsStore datetime={Math.round((new Date()).getTime() / 1000)} data={this.state.values["HRS"]}/>
            <IndicatorViewPager
                style={{height:Dimensions.get('window').height - 20, backgroundColor:'cadetblue'}}
                indicator={this._renderDotIndicator()}
            >
                <View>
                    <Text>{this.state.info}</Text>
                </View>
                <View>
                    <HrsComponent data={this.state.values["HRS"]}/>
                </View>
                <View>
                    <EdaComponent data={this.state.values["EDA"]}/>
                </View>
            </IndicatorViewPager>
        </View>
      )
  }

  _renderDotIndicator() {
      return <PagerDotIndicator pageCount={3} />;
  }
}
