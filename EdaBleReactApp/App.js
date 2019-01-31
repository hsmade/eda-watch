import React, { Component } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { PermissionsAndroid } from 'react-native';
import { IndicatorViewPager, PagerTitleIndicator} from 'rn-viewpager';
import { ConvertData as EdaConverter } from './EDA';
import { ConvertData as HrsConverter } from './HRS';
import { Chart } from './Chart';
import { Button, Switch } from 'react-native';
import { openDatabase } from 'react-native-sqlite-storage';

function requestCoarseLocationPermission() {
    const enabled = PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
    if (!enabled) {
        console.log("Permission not enabled");
        const granted = PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
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
            liveData: true,
            databases: {HRS: null, EDA: null},
            chartStart: new Date(1900,1,1).getTime(),
            chartEnd: new Date(2040, 1,1).getTime(),
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

    componentWillMount() {
        Object.keys(this.characteristics).map(db => {
            console.log("init DB", db);
            const dbm = openDatabase(
                db,
                () => {console.log("DB opened", db)},
                this.databaseError.bind(this)
            );
            this.setState({databases: {...this.state.databases, [db]: dbm}});
            dbm.executeSql(
                "CREATE TABLE IF NOT EXISTS data (datetime INTEGER PRIMARY KEY, value VARCHAR(20))",
                [],
                null,
                this.databaseError.bind(this)
            );
        });
        this.scanAndConnect();
    }

    info(message) {
        this.setState({info: message})
    }

    error(message) {
        this.setState({info: "ERROR: " + message})
    }

    databaseError(error) {
        console.log(error);
        this.error(error.message);
    }

    updateDB(db, value) {
        // console.log("updateDB", db, value);
        if (this.state.databases[db] !== null) this.state.databases[db].executeSql(
            "INSERT INTO data values(?1, ?2)",
            [new Date().getTime(), value],
            null,
            this.databaseError.bind(this)
        );
    }

    updateValue(key, value) {
        this.setState({values: {...this.state.values, [key]: value}});
        this.updateDB(key, value);

        if (this.state.liveData) {  // add data to live chart
            console.log("Update live data", key, value);
            this.setState({chartData: {...this.state.chartData, [key]: this.state.chartData[key].concat([{x: new Date(), y: value}]) } });
            if (this.state.chartData[key].length > 60) {
                this.setState({ chartData: {...this.state.chartData, [key]: this.state.chartData[key].slice(1) }})
            }
        }
    }

    scanAndConnect() {
        this.manager.startDeviceScan(
            null,
            {ScanMode: "LowLatency"},
            (error, device) => {
                this.info("Scanning...");

                if (error) {
                    console.log(error);
                    this.error("Got error: "+ error.message);
                    return
                }

                if (device.name === 'EDA') {
                    this.info("Connecting to EDA");
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
                        },
                            (error) => {
                            this.error(error.message)
                        })
                }
            }
        );
    }

    async setupNotifications(device) {
        for (const uuid in this.characteristics) {
            console.log("Setting up notifs", device);
            device.monitorCharacteristicForService(
                this.characteristics[uuid].service,
                this.characteristics[uuid].characteristic,
                (error, characteristic) => {
                    // console.log("monitorCharacteristicForService:", error, characteristic)
                    if (error !== null) {
                        this.scanAndConnect()
                    }
                    this.updateValue(uuid, this.characteristics[uuid].conversion(characteristic.value))
                }
            )
        }
    }

    switchLive(status) {
        this.setState({liveData: status});

        if (!status) {
            // fetch data and put it in the chartData
            Object.keys(this.characteristics).map(db => {
                console.log("Fetch db data", db);
                const dbm = this.state.databases[db];
                if (dbm !== null) dbm.executeSql(
                    "SELECT * FROM data where datetime >= ?1 AND datetime <= ?2",
                    [this.state.chartStart, this.state.chartEnd],
                    (tx, result) => {
                        let data = [];
                        for (let i=0; i<tx.rows.length; i++) {
                            const row = tx.rows.item(i);
                            console.log("ROW:", db, i, row);
                            const datarow = {x: row["datetime"], y: row["value"]};
                            data.push(datarow);
                        }
                        this.setState({chartData: {...this.state.chartData, [db]: data}})
                    },
                    this.databaseError
                )
            })
        } else {
            // reset chart data to fit live data
            this.setState({ chartData: {HRS: [{x: new Date(), y: 0},{x: new Date(), y: 0}], EDA: [{x: new Date(), y: 0},{x: new Date(), y: 0}]} })
        }
    }

    render() {
        return(
            <View style={{flex:1}}>
                <IndicatorViewPager
                    style={{height:Dimensions.get('window').height - 20, backgroundColor:'#263238'}}
                    indicator={this._renderIndicator()}
                >
                    <View>
                        <Text style={{color: '#ECEFF1'}}>{this.state.info}</Text>
                        <Button title="connect" onPress={this.scanAndConnect.bind(this)}/>
                        <Switch
                            onValueChange={this.switchLive.bind(this)} value={this.state.liveData}
                        />
                    </View>
                    <View>
                        <Chart data={[this.state.chartData["HRS"], this.state.chartData["EDA"]]} />
                    </View>
                </IndicatorViewPager>
            </View>
        )
    }

    _renderIndicator() {
        return <PagerTitleIndicator titles = {['Info', 'Graph']} />;
    }
}
