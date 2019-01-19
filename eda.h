/** @file
 *
 * @defgroup ble_eda Eda Service
 * @{
 * @ingroup ble_sdk_srv
 * @brief Eda Service module.
 *
 * @details This module implements the Eda Service with the Eda Level characteristic.
 *          During initialization it adds the Eda Service and Eda Level characteristic
 *          to the BLE stack database. Optionally it can also add a Report Reference descriptor
 *          to the Eda Level characteristic (used when including the Eda Service in
 *          the HID service).
 *
 *          If specified, the module will support notification of the Eda Level characteristic
 *          through the ble_eda_level_update() function.
 *          If an event handler is supplied by the application, the Eda Service will
 *          generate Eda Service events to the application.
 *
 * @note    The application must register this module as BLE event observer using the
 *          NRF_SDH_BLE_OBSERVER macro. Example:
 *          @code
 *              ble_eda_t instance;
 *              NRF_SDH_BLE_OBSERVER(anything, BLE_EDA_BLE_OBSERVER_PRIO,
 *                                   ble_eda_on_ble_evt, &instance);
 *          @endcode
 *
 * @note Attention!
 *  To maintain compliance with Nordic Semiconductor ASA Bluetooth profile
 *  qualification listings, this section of source code must not be modified.
 */
#ifndef BLE_EDA_H__
#define BLE_EDA_H__

#include <stdint.h>
#include <stdbool.h>
#include "ble.h"
#include "ble_srv_common.h"
#include "nrf_sdh_ble.h"

#ifdef __cplusplus
extern "C" {
#endif

//#define BLE_UUID_EDA_SERVICE_BASE_UUID {{0x9B, 0xD2, 0xBA, 0x50, 0x92, 0xC9, 0xAD, 0x91, 0x21, 0x4C, 0x94, 0x48, 0x70, 0x95, 0xF7, 0xAF}}
//#define BLE_UUID_EDA_CHAR_VALUE_UUID   {{0x9B, 0xD2, 0xBA, 0x50, 0x92, 0xC9, 0xAD, 0x91, 0x21, 0x4C, 0x94, 0x48, 0x71, 0x95, 0xF7, 0xAF}}
#define BLE_UUID_EDA_SERVICE_BASE_UUID 0xFDB7
#define BLE_UUID_EDA_CHAR_VALUE_UUID   0xFDB8
#define INVALID_LEVEL 0


/**@brief Macro for defining a ble_eda instance.
 *
 * @param   _name  Name of the instance.
 * @hideinitializer
 */
#define BLE_EDA_DEF(_name)                          \
    static ble_eda_t _name;                         \
    NRF_SDH_BLE_OBSERVER(_name ## _obs,             \
                         BLE_EDA_BLE_OBSERVER_PRIO, \
                         ble_eda_on_ble_evt,        \
                         &_name)


/**@brief Eda Service event type. */
typedef enum
{
    BLE_EDA_EVT_NOTIFICATION_ENABLED, /**< Eda value notification enabled event. */
    BLE_EDA_EVT_NOTIFICATION_DISABLED /**< Eda value notification disabled event. */
} ble_eda_evt_type_t;

/**@brief Eda Service event. */
typedef struct
{
    ble_eda_evt_type_t evt_type;    /**< Type of event. */
    uint16_t           conn_handle; /**< Connection handle. */
} ble_eda_evt_t;

// Forward declaration of the ble_eda_t type.
typedef struct ble_eda_s ble_eda_t;

/**@brief Eda Service event handler type. */
typedef void (* ble_eda_evt_handler_t) (ble_eda_t * p_eda, ble_eda_evt_t * p_evt);

/**@brief Eda Service init structure. This contains all options and data needed for
 *        initialization of the service.*/
typedef struct
{
    ble_eda_evt_handler_t  evt_handler;                    /**< Event handler to be called for handling events in the Eda Service. */
    bool                   support_notification;           /**< TRUE if notification of Eda Level measurement is supported. */
    ble_srv_report_ref_t * p_report_ref;                   /**< If not NULL, a Report Reference descriptor with the specified value will be added to the Eda Level characteristic */
    uint8_t                initial_level;             /**< Initial eda level */
    security_req_t         bl_rd_sec;                      /**< Security requirement for reading the BL characteristic value. */
    security_req_t         bl_cccd_wr_sec;                 /**< Security requirement for writing the BL characteristic CCCD. */
    security_req_t         bl_report_rd_sec;               /**< Security requirement for reading the BL characteristic descriptor. */
} ble_eda_init_t;

/**@brief Eda Service structure. This contains various status information for the service. */
struct ble_eda_s
{
    ble_eda_evt_handler_t    evt_handler;               /**< Event handler to be called for handling events in the Eda Service. */
    uint16_t                 service_handle;            /**< Handle of Eda Service (as provided by the BLE stack). */
    ble_gatts_char_handles_t eda_level_handles;     /**< Handles related to the Eda Level characteristic. */
    uint16_t                 report_ref_handle;         /**< Handle of the Report Reference descriptor. */
    uint8_t                  eda_level_last;        /**< Last Eda Level measurement passed to the Eda Service. */
    bool                     is_notification_supported; /**< TRUE if notification of Eda Level is supported. */
};


/**@brief Function for initializing the Eda Service.
 *
 * @param[out]  p_eda       Eda Service structure. This structure will have to be supplied by
 *                          the application. It will be initialized by this function, and will later
 *                          be used to identify this particular service instance.
 * @param[in]   p_eda_init  Information needed to initialize the service.
 *
 * @return      NRF_SUCCESS on successful initialization of service, otherwise an error code.
 */
ret_code_t ble_eda_init(ble_eda_t * p_eda, const ble_eda_init_t * p_eda_init);


/**@brief Function for handling the Application's BLE Stack events.
 *
 * @details Handles all events from the BLE stack of interest to the Eda Service.
 *
 * @note For the requirements in the EDA specification to be fulfilled,
 *       ble_eda_level_update() must be called upon reconnection if the
 *       eda level has changed while the service has been disconnected from a bonded
 *       client.
 *
 * @param[in]   p_ble_evt   Event received from the BLE stack.
 * @param[in]   p_context   Eda Service structure.
 */
void ble_eda_on_ble_evt(ble_evt_t const * p_ble_evt, void * p_context);


/**@brief Function for updating the eda level.
 *
 * @details The application calls this function after having performed a eda measurement.
 *          The eda level characteristic will only be sent to the clients which have
 *          enabled notifications. \ref BLE_CONN_HANDLE_ALL can be used as a connection handle
 *          to send notifications to all connected devices.
 *
 * @param[in]   p_eda          Eda Service structure.
 * @param[in]   eda_level      New eda measurement value (in percent of full capacity).
 * @param[in]   conn_handle    Connection handle.
 *
 * @return      NRF_SUCCESS on success, otherwise an error code.
 */
ret_code_t ble_eda_level_update(ble_eda_t * p_eda,
                                        uint8_t    eda_level,
                                        uint16_t    conn_handle);


/**@brief Function for sending the last eda level when bonded client reconnects.
 *
 * @details The application calls this function, in the case of a reconnection of
 *          a bonded client if the value of the eda has changed since
 *          its disconnection.
 *
 * @note For the requirements in the EDA specification to be fulfilled,
 *       this function must be called upon reconnection if the eda level has changed
 *       while the service has been disconnected from a bonded client.
 *
 * @param[in]   p_eda          Eda Service structure.
 * @param[in]   conn_handle    Connection handle.
 *
 * @return      NRF_SUCCESS on success,
 *              NRF_ERROR_INVALID_STATE when notification is not supported,
 *              otherwise an error code returned by @ref sd_ble_gatts_hvx.
 */
ret_code_t ble_eda_lvl_on_reconnection_update(ble_eda_t * p_eda,
                                                      uint16_t    conn_handle);


#ifdef __cplusplus
}
#endif

#endif // BLE_EDA_H__

/** @} */
