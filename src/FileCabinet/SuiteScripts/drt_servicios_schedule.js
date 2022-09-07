/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
 define(['N/https', 'N/record', 'N/search', 'N/format'],
 /**
* @param{https} https
* @param{record} record
* @param{search} search
*/
 (https, record, search, format) => {
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

            let respuesta = {
                success: false,
                message: '',
                data: [],
                errors: []
            };

            var searchResultCount = locationsArray.runPaged().count;

            let locationsArrayResult = locationsArray.run().getRange(0, searchResultCount);
            locationsArrayResult.forEach(location => {
                let sgc_id = location.getValue({ name: "internalid" });
                let location_id = location.getValue({ name: "internalid", join: "CUSTRECORD_PTG_SGC_LOCAL_PLANTA" });
                let folio = location.getValue({ name: "custrecord_ptg_sgc_local_folio" });
                let planta = location.getValue({ name: "custrecord_ptg_sgc_local_planta" });
                let ip = location.getValue({ name: "custrecord_ptg_ip_sgc", join: "CUSTRECORD_PTG_SGC_LOCAL_PLANTA" });
                let fecha = "2022-08-30";
                log.audit('Entra en la ubicación', `SGC ID: ${sgc_id} - Location Id: ${location_id} - Folio: ${folio} - Nombre Planta: ${planta} - IP: ${ip}`);

                // Getting all services by folio + 100
                let credentials = {
                    host: ip, // IP del servidor
                    user: 'root',
                    password: 'root',
                    db: 'sgc',
                };
                // let credentials = {
                //     host: '195.179.237.153', // IP del servidor
                //     user: 'u570911546_sgc',
                //     password: '7837336aA',
                //     db: 'u570911546_sgc',
                // };

                let data = {
                    credentials,
                    folio,
                    fecha
                }

                let url = `https://b03c-177-226-112-81.ngrok.io/api/getServicios`;
                // let url = `https://i-ptg-sgclc-middleware-api-dtt-middleware.apps.mw-cluster.kt77.p1.openshiftapps.com/api/getServicios`;

                let headers = {
                    'content-type': 'application/json',
                    'accept': 'application/json'
                }

                let response = https.post({
                    url: url,
                    headers: headers,
                    body: JSON.stringify(data)
                });

                log.audit({
                    title: "Data:",
                    details: JSON.stringify(data)
                });

                let responseBody = JSON.parse(response.body);
                let statusResponse = responseBody.status;
                let servicios = responseBody.servicios;
                let message = responseBody.message;

                let oportunidadesAfectadas = [];

                log.audit({
                    title: "Status Response: ",
                    details: `Status: ${statusResponse} - Message: ${message}`
                });

                log.audit({
                    title: "Servicios: ",
                    details: JSON.stringify(servicios)
                })

                if (servicios.length > 0) {
                    servicios.forEach(servicio => {
                        let embarque = servicio.cuenta.toString().slice(-2);
                        let cuenta = servicio.cuenta.toString().slice(0, -2).padStart(10, '0');

                        log.audit({
                            title: "Cliente: ",
                            details: `Cliente: ${cuenta} - Embarque: ${embarque} - Autotanque: ${servicio.no_autotanque}`
                        });
                        // Crear nuevo record en servicios no conciliados
                        try {
                            // customrecord_ptg_registro_servicios_es_l
                            // Antes de crear servicio no conciliado, buscar si ya existe uno con el mismo folio
                            var customrecord_ptg_registro_servicios_es_lSearchObj = search.create({
                                type: "customrecord_ptg_registro_servicios_es_l",
                                filters:
                                    [
                                        ["custrecord_ptg_folio_reg_sin_c_2", "is", servicio.id_servicio],
                                        "AND",
                                        ["custrecord_ptg_planta_sin_conciliar_2", "anyof", location_id],
                                    ],
                                columns:
                                    [
                                        "internalid",
                                        "custrecord_ptg_planta_sin_conciliar_2",
                                        search.createColumn({
                                            name: "custrecord_ptg_ruta_sin_conciliar_2",
                                            sort: search.Sort.ASC
                                        }),
                                        "custrecord_ptg_folio_reg_sin_c_2"
                                    ]
                            });
                            var customrecord_ptg_registro_servicios_es_lSearchObjCount = customrecord_ptg_registro_servicios_es_lSearchObj.runPaged().count;
                            log.debug("Validación de servicio_id como folio:", customrecord_ptg_registro_servicios_es_lSearchObjCount);

                            if (customrecord_ptg_registro_servicios_es_lSearchObjCount > 0) {
                                log.audit({
                                    title: `Servicio ${servicio.id_servicio} ya existe.`,
                                    details: `Folio: ${servicio.id_servicio}`
                                });
                            } else {
                                // Buscar numero de ruta/id del equipo en base al id de vehiculo
                                var customrecord_ptg_equiposSearchObj = search.create({
                                    type: "customrecord_ptg_equipos",
                                    filters:
                                        [
                                            ["custrecord_ptg_autotanquesgc_", "is", servicio.no_autotanque],
                                        ],
                                    columns:
                                        [
                                            "internalid",
                                            search.createColumn({
                                                name: "name",
                                                sort: search.Sort.ASC
                                            }),
                                            "custrecord_ptg_autotanquesgc_"
                                        ]
                                });

                                var customrecord_ptg_equiposSearchObjCount = customrecord_ptg_equiposSearchObj.runPaged().count;
                                log.debug("Buscando equipo por no. autotanque:", customrecord_ptg_equiposSearchObjCount);

                                const PUBLICO_GENERAL = 27041;
                                let recServicioNoConciliado = record.create({
                                    type: "customrecord_ptg_registro_servicios_es_l",
                                    // type: "customrecord_ptg_registros_sin_conciliar",
                                });

                                recServicioNoConciliado.setValue({
                                    fieldId: "custrecord_ptg_cliente_reg_serv_est_lin",
                                    value: PUBLICO_GENERAL
                                });

                                // Litros
                                recServicioNoConciliado.setValue({
                                    fieldId: "custrecord_ptg_cantidad_reg_serv_est_lin",
                                    value: servicio.volumen
                                });

                                // Precio sin iva
                                let precioSinIva = servicio.precio_str / 1.16;
                                let totalSinIva = (precioSinIva.toFixed(4) * servicio.volumen).toFixed(2);
                                let iva = (totalSinIva * 0.16).toFixed(2);

                                recServicioNoConciliado.setValue({
                                    fieldId: "custrecord_ptg_precio_reg_serv_est_lin",
                                    value: precioSinIva.toFixed(4)
                                });

                                recServicioNoConciliado.setValue({
                                    fieldId: "custrecord_ptg_subtotal_registro_servs_e",
                                    value: totalSinIva
                                });

                                recServicioNoConciliado.setValue({
                                    fieldId: "custrecord_ptg_impuesto_reg_serv_est_lin",
                                    value: iva
                                });

                                recServicioNoConciliado.setValue({
                                    fieldId: "custrecord_ptg_total_reg_serv_est_lin",
                                    value: (servicio.precio * servicio.volumen).toFixed(4)
                                });

                                recServicioNoConciliado.setValue({
                                    fieldId: "custrecord_ptg_form_pago_reg_serv_est_li",
                                    value: "1"
                                });

                                recServicioNoConciliado.setValue({
                                    fieldId: "custrecord_ptg_cant_old_reg_serv_est_lin",
                                    value: servicio.volumen
                                });

                                if (customrecord_ptg_equiposSearchObjCount > 0) {
                                    let customrecord_ptg_equiposSearchResult = customrecord_ptg_equiposSearchObj.run().getRange({ start: 0, end: customrecord_ptg_equiposSearchObjCount });
                                    let equipoId = customrecord_ptg_equiposSearchResult[0].getValue({ name: "internalid" });
                                    log.debug('equipoId', equipoId);

                                    // Ruta
                                    recServicioNoConciliado.setValue({
                                        fieldId: "custrecord_ptg_ruta_sin_conciliar_2",
                                        value: equipoId
                                    });
                                }

                                recServicioNoConciliado.setValue({
                                    fieldId: "custrecord_ptg_planta_sin_conciliar_2",
                                    value: location_id
                                });

                                recServicioNoConciliado.setValue({
                                    fieldId: "custrecord_ptg_litros_sin_conciliar_2",
                                    value: servicio.volumen
                                });

                                recServicioNoConciliado.setValue({
                                    fieldId: "custrecord_ptg_folio_reg_sin_c_2",
                                    value: servicio.id_servicio
                                });

                                let fechaInicio = new Date(servicio.ts1);
                                let fechaInicioServicio = format.parse({
                                    value: fechaInicio,
                                    type: format.Type.DATE
                                })
                                let horaInicioServicio = format.parse({
                                    value: fechaInicio.getHours() + ':' + fechaInicio.getMinutes() + ':' + fechaInicio.getSeconds(),
                                    type: format.Type.TIMEOFDAY
                                });

                                recServicioNoConciliado.setValue({
                                    fieldId: "custrecord_ptg_sgcloc_fecha_2_",
                                    value: fechaInicioServicio
                                });

                                recServicioNoConciliado.setValue({
                                    fieldId: "custrecord_ptg_sgcloc_hora_2_",
                                    value: horaInicioServicio
                                });

                                recServicioNoConciliado.setValue({
                                    fieldId: "custrecord_ptg_folio_aut_2_",
                                    value: servicio.id_servicio
                                });

                                recServicioNoConciliado.setValue({
                                    fieldId: "custrecord_ptg_folio_sgc_2_",
                                    value: servicio.id_servicio
                                });

                                recServicioNoConciliado.setValue({
                                    fieldId: "custrecord_ptg_fechainicio_sgc_2_",
                                    value: fechaInicioServicio
                                });

                                recServicioNoConciliado.setValue({
                                    fieldId: "custrecord_ptg_foliounidad_sgc_2_",
                                    value: servicio.id_servicio
                                });

                                recServicioNoConciliado.setValue({
                                    fieldId: "custrecord_ptg_tipo_sgc_2_",
                                    value: "2"
                                });

                                let servicioNoConciliadoId = recServicioNoConciliado.save();
                                log.debug('Registro de servicio:', servicioNoConciliadoId);

                                oportunidadesAfectadas.push(servicioNoConciliadoId);

                                // Update the SGC Local Folio record
                                let recSGC = record.load({
                                    type: "customrecord_ptg_folio_sgc_local",
                                    id: sgc_id
                                });

                                recSGC.setValue({
                                    fieldId: "custrecord_ptg_sgc_local_folio",
                                    value: servicio.id_servicio
                                });

                                let savedFolio = recSGC.save();
                                log.debug('Folio Actualizado:', servicio.id_servicio);
                            }
                        } catch (error) {
                            log.error({
                                title: "Error al crear la oportunidad",
                                details: error
                            });
                        }
                    });
                }

                respuesta.data.push({
                    location: planta,
                    oportunidades: oportunidadesAfectadas
                });
            });

            respuesta.success = (respuesta.data.length > 0) ? true : false;
            respuesta.message = (respuesta.data.length > 0) ? 'Se crearon las oportunidades correctamente' : 'No se crearon las oportunidades';

            log.audit({
                title: "Proceso finalizado...",
                details: `Proceso terminado: ${JSON.stringify(respuesta)}`
            })
            // return respuesta;
        } catch (error) {
            log.debug('Error scheduled:', error)
        }

    }
    return { execute }
});
