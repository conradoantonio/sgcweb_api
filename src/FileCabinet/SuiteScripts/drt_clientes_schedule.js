/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
 define(['N/https', 'N/record', 'N/search'],
 /**
* @param{https} https
* @param{record} record
* @param{search} search
*/
(https, record, search) => {

    /**
     * Defines the Scheduled script trigger point.
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
     * @since 2015.2
     */
    const execute = (scriptContext) => {
        try {
            // Buscar plantas que tienen SGC Local
            var locationsArray = search.create({
                type: "customrecord_ptg_folio_sgc_local",
                filters:
                    [],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            sort: search.Sort.ASC,
                            label: "SGC Local ID"
                        }),
                        search.createColumn({ name: "custrecord_ptg_sgc_local_folio", label: "Folio" }),
                        search.createColumn({
                            name: "internalid",
                            join: "CUSTRECORD_PTG_SGC_LOCAL_PLANTA",
                            label: "Internal ID"
                        }),
                        search.createColumn({ name: "custrecord_ptg_sgc_local_planta", label: "Planta" }),
                        search.createColumn({
                            name: "custrecord_ptg_ip_sgc",
                            join: "CUSTRECORD_PTG_SGC_LOCAL_PLANTA",
                            label: "PTG - IP SGC"
                        })
                    ]
            });
            let locationsArrayCount = locationsArray.runPaged().count;
            let locationsArrayResult = locationsArray.run().getRange(0, locationsArrayCount);

            let clientesActualizados = 0;
            locationsArrayResult.forEach(location => {
                let sgc_id = location.getValue({ name: "internalid" });
                let location_id = location.getValue({ name: "internalid", join: "CUSTRECORD_PTG_SGC_LOCAL_PLANTA" });
                let planta = location.getValue({ name: "custrecord_ptg_sgc_local_planta" });
                let ip = location.getValue({ name: "custrecord_ptg_ip_sgc", join: "CUSTRECORD_PTG_SGC_LOCAL_PLANTA" });
                log.audit('Entra en la ubicación', `SGC ID: ${sgc_id} - Location Id: ${location_id} - Nombre Planta: ${planta} - IP: ${ip}`);

                let itemSearchObj = search.create({
                    type: search.Type.CUSTOMER,
                    filters: [
                        ['custentity_ptg_cliente_act_sgc', 'is', 'T'],
                    ],
                    columns:
                        [
                            "entityid",
                            "altname",
                            "custentity_ptg_plantarelacionada_"
                        ]
                });

                let searchResultCount = itemSearchObj.runPaged().count;
                log.debug("itemSearchObj result count", searchResultCount);

                let startGeneral = 0;
                let endGeneral = searchResultCount;

                let singleresults = itemSearchObj.run().getRange({ start: startGeneral, end: endGeneral });

                let credentials = {
                    host: ip, // Cambia por el IP de la location
                    user: 'root',
                    password: 'root',
                    db: 'sgc',
                    location: location_id
                };
                // let credentials = {
                //     host: '195.179.237.153', // Cambia por el IP de la location
                //     user: 'u570911546_sgc',
                //     password: '7837336aA',
                //     db: 'u570911546_sgc',
                //     location: location_id
                // };

                let data = {
                    credentials,
                    clientes: [],
                }

                let url = `https://ba2a-177-226-112-81.ngrok.io/api/syncClientes`;
                // let url = `https://i-ptg-sgclc-middleware-api-dtt-middleware.apps.mw-cluster.kt77.p1.openshiftapps.com/api/syncClientes`;

                singleresults.forEach(cliente => {
                    try {
                        // Find if custentity_ptg_plantarelacionada_ exist whitin the location array
                        let plantarelacionada = cliente.getValue({ name: "custentity_ptg_plantarelacionada_" });

                        if (plantarelacionada === location_id) {
                            let clientRecord = record.load({ type: 'customer', id: cliente.getValue({ name: "entityid" }) });

                            let client = {
                                cuenta: clientRecord.getValue({ fieldId: 'entityid' }),
                                num_ruta: clientRecord.getValue({ fieldId: 'custrecord_ptg_ruta_asignada' }),
                                Nombre: clientRecord.getValue({ fieldId: 'altname' }),
                                Domicilio: clientRecord.getValue({ fieldId: 'defaultaddress' }),
                                Colonia: clientRecord.getValue({ fieldId: 'custrecord_ptg_colonia_ruta' }),
                                CP: clientRecord.getValue({ fieldId: 'custrecord_ptg_codigo_postal' }),
                                Ciudad: clientRecord.getValue({ fieldId: 'city' }),
                                RFC: clientRecord.getValue({ fieldId: 'custentity_mx_rfc' }),
                                Telefono: clientRecord.getValue({ fieldId: 'custrecord_ptg_telefono_principal' }),
                                Derechos: '0002',
                                Contador: '1',
                                Comentario1: '',
                                Comentario2: '@14',
                                id_precio: clientRecord.getValue({ fieldId: 'custrecord_ptg_precio_' }),
                                id_impuesto: '2',
                                GPS: '89 59.9999N 179 59.9999E',
                                Tiempo_inicio: '12:00:00',
                                Tiempo_fin: '11:59:00',
                                CURP: clientRecord.getValue({ fieldId: 'custrecord_ptg_numero_contrato' }),
                                Saldo: '0',
                                PrecioComer: '0',
                                num_fact: '1',
                                observacion2: 'Observacion 2',
                                observacion1: 'Observacion 1',
                                observacion3: 'Observacion 3',
                                observacion4: 'Observacion 4',
                                observacion5: 'Observacion 5',
                                observacion6: 'Observacion 6',
                                observacion7: 'Observacion 7',
                                observacion8: 'Observacion 8',
                                observacion9: 'Observacion 9',
                                observacion10: 'Observacion 10',
                            }

                            data.clientes.push(client);
                        }
                    } catch (error) {
                        // log.error({
                        //     title: `Error`,
                        //     details: `${error}`
                        // });
                    }
                });

                let headers = {
                    'content-type': 'application/json',
                    'accept': 'application/json'
                }

                log.audit({
                    title: `Envio de datos`,
                    details: `${JSON.stringify(data)}`
                });

                let response = https.post({
                    url: url,
                    headers: headers,
                    body: JSON.stringify(data)
                });

                log.debug('response', response.body);
                // Update clientes with new status
                let clientes = JSON.parse(response.body).clientes;
                let status = JSON.parse(response.body).status || false;
                log.audit({
                    title: `Clientes:`,
                    details: clientes
                })
                if (status) {
                    clientes.forEach(cliente => {
                        try {
                            let clientRecord = record.load({
                                type: record.Type.CUSTOMER,
                                id: cliente.data.cuenta
                            });
                            clientRecord.setValue({ fieldId: 'custentity_ptg_cliente_act_sgc', value: false });
                            clientRecord.save();
                            clientesActualizados++;
                            log.audit({
                                title: `Cliente:`,
                                details: `${cliente.data.cuenta} - ${cliente.data.Nombre} Actualizado`
                            });
                        } catch (error) {
                            log.error({
                                title: `Error al actualizar cliente:`,
                                details: `${error}`
                            });
                        }
                    });
                } else {
                    log.error({
                        title: `Error`,
                        details: `${JSON.parse(response.body).message}`
                    });
                }
            });
            log.audit({
                title: `Proceso finalizado...`,
                details: `Clientes actualizados: ${clientesActualizados}`
            });
        } catch (error) {
            log.debug('Error scheduled:', error)
        }
    }

    return { execute }
});
