# eda watch
A smart watch that registers skin resistance: [eda](https://en.wikipedia.org/wiki/Electrodermal_activity).

## bluetooth services
### battery
Reports the current battery percentage. This uses the SAADC to measure the battery voltage.

TODO:
 * the voltage, when supplying the board with 3V is too high (3.4V). This should be checked

### heart rate (HRS)
Currently a simulation. Should connect to a HRS device to report on heart rate

TODO:
 * get the HRS board
 * replace the simulation code with real code
 * store historical data
 * implement fetching of historical data

### eda (custom)
Reports on the inverse of the voltage (max - current) to record the change in skin resistance. This uses the SAADC and two metal pads, one connected to Vdd and one to the ADC. The bluetooth service has a notify and read for bulk download.

TODO:
 * make the ADC readings more stable. Currently they go down after a few readings.
 * store historical data
 * implement fetching of historical data

## future additions
 * buzzer - to alert on incoming notifications on the phone
 * screen - to show the current data on HRS and EDA, and text of notifications
