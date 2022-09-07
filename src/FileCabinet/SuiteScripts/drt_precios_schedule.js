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
            // Buscar folios por plantas que tienen SGC Local
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
            let locationsArrayCount  = locationsArray.runPaged().count;
            let locationsArrayResult = locationsArray.run().getRange(0, locationsArrayCount);


            // let respuesta = {
            //     success: false,
            //     message: '',
            //     data: [],
            //     errors: []
            // };

            locationsArrayResult.forEach(location => {
                let sgcId = location.getValue({ name: "internalid" });
                let location_id = location.getValue({ name: "internalid", join: "CUSTRECORD_PTG_SGC_LOCAL_PLANTA" });
                let planta = location.getValue({ name: "custrecord_ptg_sgc_local_planta" });
                let ip = location.getValue({ name: "custrecord_ptg_ip_sgc", join: "CUSTRECORD_PTG_SGC_LOCAL_PLANTA" });
                log.audit('Entra en la ubicación', `SGC ID: ${sgcId} - Location Id: ${location_id} - Nombre Planta: ${planta} - IP: ${ip}`);

                var customrecord_ptg_precios_sgc_SearchObj = search.create({
                    type: "customrecord_ptg_precios_sgc_",
                    filters:
                        [
                            ["custrecord_ptg_planta_sgc_precio_.internalid", "anyof", location_id],
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "internalid",
                                join: "CUSTRECORD_PTG_PLANTA_SGC_PRECIO_",
                                label: "Internal ID"
                            }),
                            "custrecord_ptg_planta_sgc_precio_",
                            search.createColumn({
                                name: "custrecord_ptg_id_sgc_",
                                sort: search.Sort.ASC
                            }),
                            "custrecord_ptg_precio_sgc_"
                        ]
                });
                var searchResultCount = customrecord_ptg_precios_sgc_SearchObj.runPaged().count;
                log.debug("customrecord_ptg_precios_sgc_SearchObj result count", searchResultCount);
                let singleresults = customrecord_ptg_precios_sgc_SearchObj.run().getRange({ start: 0, end: searchResultCount });

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
                    precios: [],
                }

                let url = `https://ba2a-177-226-112-81.ngrok.io/api/syncPrices`;
                // let url = `https://i-ptg-sgclc-middleware-api-dtt-middleware.apps.mw-cluster.kt77.p1.openshiftapps.com/api/syncPrices`;

                singleresults.forEach(precio => {
                    let precioObj = {
                        id_precio: precio.getValue({ name: "custrecord_ptg_id_sgc_" }),
                        precio: precio.getValue({ name: "custrecord_ptg_precio_sgc_" }),
                    }
                    data.precios.push(precioObj);
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
                let status = JSON.parse(response.body).status || false;
                if (status) {
                    log.audit({
                        title: `Finalizar proceso`,
                        details: `Finaliza proceso de sync de precios para la planta: ${location_id} - ${location.name}`
                    });
                }
            });
        } catch (err) {
            log.error({ title: 'Error', details: err });
        }
    }
    return { execute }
});

