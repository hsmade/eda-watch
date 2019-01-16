# eda watch
A smart watch that registers skin resistance: [eda](https://en.wikipedia.org/wiki/Electrodermal_activity).

## bluetooth services
### battery
Reports the current battery percentage. This uses the SAADC to measure the battery voltage.

### heart rate (HRS)
Currently a simulation. Should connect to a HRS device to report on heart rate

### eda (custom)
Reports on the inverse of the voltage (max - current) to record the change in skin resistance. This uses the SAADC and two metal pads, one connected to Vdd and one to the ADC. The bluetooth service has a notify and read for bulk download.

## future additions
 * buzzer - to alert on incoming notifications on the phone
 * screen - to show the current data on HRS and EDA, and text of notifications
