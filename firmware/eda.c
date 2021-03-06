#include "sdk_common.h"
#include "eda.h"
#include <string.h>
#include "ble_srv_common.h"
#include "ble_conn_state.h"

#define NRF_LOG_MODULE_NAME ble_eda
#if BLE_EDA_CONFIG_LOG_ENABLED
#define NRF_LOG_LEVEL       BLE_EDA_CONFIG_LOG_LEVEL
#define NRF_LOG_INFO_COLOR  BLE_EDA_CONFIG_INFO_COLOR
#define NRF_LOG_DEBUG_COLOR BLE_EDA_CONFIG_DEBUG_COLOR
#else // BLE_EDA_CONFIG_LOG_ENABLED
#define NRF_LOG_LEVEL       0
#endif // BLE_EDA_CONFIG_LOG_ENABLED
#include "nrf_log.h"
NRF_LOG_MODULE_REGISTER();

uint8_t* int16_to_array_8(uint16_t value) 
{
    static uint8_t data[2];
    data[0] = (uint8_t)(value >> 8);
    data[1] = (uint8_t)(value);
    return data;
}


/**@brief Function for handling the Write event.
 *
 * @param[in]   p_eda       Eda Service structure.
 * @param[in]   p_ble_evt   Event received from the BLE stack.
 */
static void on_write(ble_eda_t * p_eda, ble_evt_t const * p_ble_evt)
{
    if (!p_eda->is_notification_supported)
    {
        return;
    }

    ble_gatts_evt_write_t const * p_evt_write = &p_ble_evt->evt.gatts_evt.params.write;

    if (    (p_evt_write->handle == p_eda->eda_level_handles.cccd_handle)
        &&  (p_evt_write->len == 2))
    {
        if (p_eda->evt_handler == NULL)
        {
            return;
        }

        ble_eda_evt_t evt;

        if (ble_srv_is_notification_enabled(p_evt_write->data))
        {
            evt.evt_type = BLE_EDA_EVT_NOTIFICATION_ENABLED;
        }
        else
        {
            evt.evt_type = BLE_EDA_EVT_NOTIFICATION_DISABLED;
        }
        evt.conn_handle = p_ble_evt->evt.gatts_evt.conn_handle;

        // CCCD written, call application event handler.
        p_eda->evt_handler(p_eda, &evt);
    }
}


void ble_eda_on_ble_evt(ble_evt_t const * p_ble_evt, void * p_context)
{
    if ((p_context == NULL) || (p_ble_evt == NULL))
    {
        return;
    }

    ble_eda_t * p_eda = (ble_eda_t *)p_context;

    switch (p_ble_evt->header.evt_id)
    {
        case BLE_GATTS_EVT_WRITE:
            on_write(p_eda, p_ble_evt);
            break;

        default:
            // No implementation needed.
            break;
    }
}


/**@brief Function for adding the Eda Level characteristic.
 *
 * @param[in]   p_eda        Eda Service structure.
 * @param[in]   p_eda_init   Information needed to initialize the service.
 *
 * @return      NRF_SUCCESS on success, otherwise an error code.
 */
static ret_code_t eda_level_char_add(ble_eda_t * p_eda, const ble_eda_init_t * p_eda_init)
{
    ret_code_t             err_code;
    ble_add_char_params_t  add_char_params;
    ble_add_descr_params_t add_descr_params;
    uint16_t               initial_eda_level;
    uint8_t                init_len;
    uint8_t                encoded_report_ref[BLE_SRV_ENCODED_REPORT_REF_LEN];
    uint8_t                *data;

    // Add eda level characteristic
    initial_eda_level = p_eda_init->initial_level;
    data = int16_to_array_8(initial_eda_level);

    memset(&add_char_params, 0, sizeof(add_char_params));
    add_char_params.uuid              = BLE_UUID_EDA_CHAR_VALUE_UUID;
    add_char_params.max_len           = sizeof(uint16_t);
    add_char_params.init_len          = sizeof(uint16_t);
    add_char_params.p_init_value      = data;
    add_char_params.char_props.notify = p_eda->is_notification_supported;
    add_char_params.char_props.read   = 1;
    add_char_params.cccd_write_access = p_eda_init->bl_cccd_wr_sec;
    add_char_params.read_access       = p_eda_init->bl_rd_sec;

    err_code = characteristic_add(p_eda->service_handle,
                                  &add_char_params,
                                  &(p_eda->eda_level_handles));
    if (err_code != NRF_SUCCESS)
    {
        return err_code;
    }

    if (p_eda_init->p_report_ref != NULL)
    {
        // Add Report Reference descriptor
        init_len = ble_srv_report_ref_encode(encoded_report_ref, p_eda_init->p_report_ref);

        memset(&add_descr_params, 0, sizeof(add_descr_params));
        add_descr_params.uuid        = BLE_UUID_REPORT_REF_DESCR;
        add_descr_params.read_access = p_eda_init->bl_report_rd_sec;
        add_descr_params.init_len    = init_len;
        add_descr_params.max_len     = add_descr_params.init_len;
        add_descr_params.p_value     = encoded_report_ref;

        err_code = descriptor_add(p_eda->eda_level_handles.value_handle,
                                  &add_descr_params,
                                  &p_eda->report_ref_handle);
        return err_code;
    }
    else
    {
        p_eda->report_ref_handle = BLE_GATT_HANDLE_INVALID;
    }

    return NRF_SUCCESS;
}


ret_code_t ble_eda_init(ble_eda_t * p_eda, const ble_eda_init_t * p_eda_init)
{
    if (p_eda == NULL || p_eda_init == NULL)
    {
        return NRF_ERROR_NULL;
    }

    ret_code_t err_code;
    ble_uuid_t ble_uuid;

    // Initialize service structure
    p_eda->evt_handler               = p_eda_init->evt_handler;
    p_eda->is_notification_supported = p_eda_init->support_notification;
    p_eda->eda_level_last        = INVALID_LEVEL;

    // Add service
    BLE_UUID_BLE_ASSIGN(ble_uuid, BLE_UUID_EDA_SERVICE_BASE_UUID);

    err_code = sd_ble_gatts_service_add(BLE_GATTS_SRVC_TYPE_PRIMARY, &ble_uuid, &p_eda->service_handle);
    VERIFY_SUCCESS(err_code);

    // Add eda level characteristic
    err_code = eda_level_char_add(p_eda, p_eda_init);
    return err_code;
}


/**@brief Function for sending notifications with the Eda Level characteristic.
 *
 * @param[in]   p_hvx_params Pointer to structure with notification data.
 * @param[in]   conn_handle  Connection handle.
 *
 * @return      NRF_SUCCESS on success, otherwise an error code.
 */
static ret_code_t eda_notification_send(ble_gatts_hvx_params_t * const p_hvx_params,
                                            uint16_t                       conn_handle)
{
    ret_code_t err_code = sd_ble_gatts_hvx(conn_handle, p_hvx_params);
    if (err_code == NRF_SUCCESS)
    {
        NRF_LOG_INFO("Eda notification has been sent using conn_handle: 0x%04X", conn_handle);
    }
    else
    {
        NRF_LOG_DEBUG("Error: 0x%08X while sending notification with conn_handle: 0x%04X",
                      err_code,
                      conn_handle);
    }
    return err_code;
}


ret_code_t ble_eda_level_update(ble_eda_t * p_eda,
                                        uint16_t    eda_level,
                                        uint16_t    conn_handle)
{
    if (p_eda == NULL)
    {
        return NRF_ERROR_NULL;
    }

    ret_code_t         err_code = NRF_SUCCESS;
    ble_gatts_value_t  gatts_value;
    uint8_t *data = int16_to_array_8(eda_level);


    if (eda_level != p_eda->eda_level_last)
    {
        // Initialize value struct.
        memset(&gatts_value, 0, sizeof(gatts_value));

        gatts_value.len     = sizeof(uint16_t);
        gatts_value.offset  = 0;
        gatts_value.p_value = data;

        // Update dataedae.
        err_code = sd_ble_gatts_value_set(BLE_CONN_HANDLE_INVALID,
                                          p_eda->eda_level_handles.value_handle,
                                          &gatts_value);
        if (err_code == NRF_SUCCESS)
        {
            NRF_LOG_INFO("Eda level has been updated: %d%%", eda_level)

            // Save new eda value.
            p_eda->eda_level_last = *data;
        }
        else
        {
            NRF_LOG_DEBUG("Error during eda level update: 0x%08X", err_code)

            return err_code;
        }

        // Send value if connected and notifying.
        if (p_eda->is_notification_supported)
        {
            ble_gatts_hvx_params_t hvx_params;

            memset(&hvx_params, 0, sizeof(hvx_params));

            hvx_params.handle = p_eda->eda_level_handles.value_handle;
            hvx_params.type   = BLE_GATT_HVX_NOTIFICATION;
            hvx_params.offset = gatts_value.offset;
            hvx_params.p_len  = &gatts_value.len;
            hvx_params.p_data = gatts_value.p_value;

            if (conn_handle == BLE_CONN_HANDLE_ALL)
            {
                ble_conn_state_conn_handle_list_t conn_handles = ble_conn_state_conn_handles();

                // Try sending notifications to all valid connection handles.
                for (uint32_t i = 0; i < conn_handles.len; i++)
                {
                    if (ble_conn_state_status(conn_handles.conn_handles[i]) == BLE_CONN_STATUS_CONNECTED)
                    {
                        if (err_code == NRF_SUCCESS)
                        {
                            err_code = eda_notification_send(&hvx_params,
                                                                 conn_handles.conn_handles[i]);
                        }
                        else
                        {
                            // Preserve the first non-zero error code
                            UNUSED_RETURN_VALUE(eda_notification_send(&hvx_params,
                                                                          conn_handles.conn_handles[i]));
                        }
                    }
                }
            }
            else
            {
                err_code = eda_notification_send(&hvx_params, conn_handle);
            }
        }
        else
        {
            err_code = NRF_ERROR_INVALID_STATE;
        }
    }

    return err_code;
}


ret_code_t ble_eda_lvl_on_reconnection_update(ble_eda_t * p_eda, uint16_t    conn_handle)
{
    if (p_eda == NULL)
    {
        return NRF_ERROR_NULL;
    }

    ret_code_t err_code;

    if (p_eda->is_notification_supported)
    {
        ble_gatts_hvx_params_t hvx_params;
        uint16_t               len = sizeof(uint8_t);
        uint8_t *data = int16_to_array_8(p_eda->eda_level_last);
        

        memset(&hvx_params, 0, sizeof(hvx_params));

        hvx_params.handle = p_eda->eda_level_handles.value_handle;
        hvx_params.type   = BLE_GATT_HVX_NOTIFICATION;
        hvx_params.offset = 0;
        hvx_params.p_len  = &len;
        hvx_params.p_data = data;

        err_code = eda_notification_send(&hvx_params, conn_handle);

        return err_code;
    }

    return NRF_ERROR_INVALID_STATE;
}


