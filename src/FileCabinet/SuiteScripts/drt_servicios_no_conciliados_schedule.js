/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
 define(['N/https', 'N/record', 'N/search', 'N/runtime'],
 /**
* @param{https} https
* @param{record} record
* @param{search} search
*/
 (https, record, search, runtime) => {
     /**
      * Defines the Scheduled script trigger point.
      * @param {Object} scriptContext
      * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
      * @since 2015.2
      */
     const execute = (scriptContext) => {
         try {
             const hora = Date.now();
             let oportunidadesAfectadas = [];
             // Buscar servicios no conciliados
             let oportunidadesArray = JSON.parse(runtime.getCurrentScript().getParameter('custscript_ptg_sgc_opor_update'));

             log.debug('oportunidadesArraytypeOf', typeof oportunidadesArray);
             log.debug('oportunidadesArray', oportunidadesArray);

             if (oportunidadesArray.length > 0) {
                 oportunidadesArray.forEach(servicio => {

                     let cliente = servicio.customer;
                     let servicio_id = servicio.idInterno;
                     let location_id = servicio.planta;
                     let num_ruta = servicio.ruta;

                     var customrecord_ptg_tabladeviaje_enc2_Search = search.create({
                         type: "customrecord_ptg_tabladeviaje_enc2_",
                         filters:
                             [
                                 ["custrecord_ptg_vehiculo_tabladeviajes_.internalidnumber", "equalto", num_ruta],
                                 "AND",
                                 ["custrecord_ptg_id_vehiculo_sgc", "isnotempty", ""]
                             ],
                         columns:
                             [
                                 "custrecord_ptg_id_vehiculo_sgc"
                             ]
                     });

                     var searchResultCountNumRuta = customrecord_ptg_tabladeviaje_enc2_Search.runPaged().count;
                     log.debug("Búsqueda por número de ruta para encontrar id_vehiculo result count", searchResultCountNumRuta);

                     if (searchResultCountNumRuta > 0) {
                         let customrecord_ptg_equiposSearchResult = customrecord_ptg_tabladeviaje_enc2_Search.run().getRange({ start: 0, end: searchResultCountNumRuta });
                         let id_vehiculo = customrecord_ptg_equiposSearchResult[0].getValue({ name: "custrecord_ptg_id_vehiculo_sgc" });
                         let litros = servicio.litros;
                         let total = servicio.total;

                         log.audit({
                             title: 'Buscando por variables:',
                             details: `Buscando por planta: ${location_id} vehículo: ${id_vehiculo} Cliente: ${cliente} Litros: ${litros} Total: ${total}`
                         })

                         var opportunitySearchObj = search.create({
                             type: "opportunity",
                             filters:
                                 [
                                     ["entitystatus", "anyof", "11"],
                                     "AND",
                                     ["custbody_ptg_numero_viaje.custrecord_ptg_servicioestacionario_", "is", "T"],
                                     "AND",
                                     ["custbody_ptg_numero_viaje.custrecord_ptg_viajeactivo_", "is", "T"],
                                     "AND",
                                     ["custbody_ptg_numero_viaje.custrecord_ptg_estatus_tabladeviajes_", "anyof", "3"],
                                     "AND",
                                     ["custbody_ptg_planta_relacionada.internalid", "anyof", location_id],
                                     "AND",
                                     ["customer.internalid", "is", cliente],
                                     "AND",
                                     ["custbody_ptg_numero_viaje.custrecord_ptg_id_vehiculo_sgc", "is", id_vehiculo]
                                 ],
                             columns:
                                 [
                                     "internalid",
                                     "trandate",
                                     "tranid",
                                     "entity",
                                     "entitystatus",
                                     search.createColumn({
                                         name: "custbody_ptg_numero_viaje",
                                         sort: search.Sort.DESC
                                     }),
                                     search.createColumn({
                                         name: "custrecord_ptg_vehiculo_tabladeviajes_",
                                         join: "CUSTBODY_PTG_NUMERO_VIAJE"
                                     }),
                                     search.createColumn({
                                         name: "custrecord_ptg_id_vehiculo_sgc",
                                         join: "CUSTBODY_PTG_NUMERO_VIAJE"
                                     }),
                                     search.createColumn({
                                         name: "internalid",
                                         join: "CUSTBODY_PTG_PLANTA_RELACIONADA"
                                     })
                                 ]
                         });
                         var searchResultCount = opportunitySearchObj.runPaged().count;

                         if (searchResultCount > 0) {
                             try {
                                 let entity_status = 13;
                                 let custbody_ptg_estado_pedido = 3;

                                 let opportunitySearchResult = opportunitySearchObj.run().getRange({ start: 0, end: searchResultCount });
                                 let recOportunidad = record.load({
                                     type: "opportunity",
                                     id: opportunitySearchResult[0].getValue({ name: "internalid" })
                                 });

                                 log.audit('Se actualiza la oportunidad', opportunitySearchResult[0].getValue({ name: "internalid" }));
                                 recOportunidad.setValue({
                                     fieldId: "entitystatus",
                                     value: entity_status
                                 });

                                 recOportunidad.setValue({
                                     fieldId: "custbody_ptg_estado_pedido",
                                     value: custbody_ptg_estado_pedido
                                 });

                                 recOportunidad.setValue({
                                     fieldId: "custbody_ptg_tipo_sgc",
                                     value: 2
                                 });

                                 recOportunidad.setSublistValue({
                                     sublistId: 'item',
                                     fieldId: 'quantity',
                                     line: 0,
                                     value: litros ?? 0
                                 });
                                 log.audit('Se asigna la cantidad', litros);

                                 recOportunidad.setSublistValue({
                                     sublistId: 'item',
                                     fieldId: 'rate',
                                     line: 0,
                                     value: total ?? 0
                                 });
                                 log.audit('Se asigna el precio', total);

                                 let oportunidadId = recOportunidad.save();
                                 oportunidadesAfectadas.push(oportunidadId);
                                 log.debug(`Se actualiza la oportunidad: ${oportunidadId}`);

                                 var customrecord_ptg_tabladeviaje_enc2_SearchObj = search.create({
                                     type: "customrecord_ptg_tabladeviaje_enc2_",
                                     filters:
                                         [
                                             ["custrecord_ptg_id_vehiculo_sgc", "is", servicio.no_autotanque],
                                         ],
                                     columns:
                                         [
                                             search.createColumn({
                                                 name: "name",
                                                 sort: search.Sort.ASC
                                             }),
                                             "id",
                                             "custrecord_ptg_vehiculo_tabladeviajes_",
                                             "custrecord_ptg_viaje_tabladeviajes_",
                                             "custrecord_ptg_planta_tabladeviajes_",
                                             "custrecord_ptg_chofer_tabladeviajes_",
                                             "custrecord_ptg_id_vehiculo_sgc"
                                         ]
                                 });

                                 var opportunitySearchResult = customrecord_ptg_tabladeviaje_enc2_SearchObj.run().getRange(0, 1);
                                 log.debug('opportunitySearchResult', opportunitySearchResult);

                                 var tablaViajeId = opportunitySearchResult[0].getValue({ name: "id" });

                                 var opportunityRecord = record.load({
                                     type: "customrecord_ptg_tabladeviaje_enc2_",
                                     id: tablaViajeId
                                 });
                                 var serviciosNoConciliados = opportunityRecord.getValue({
                                     fieldId: "custrecord_ptg_contador_sin_conciliar"
                                 }) || 0;

                                 serviciosNoConciliados = parseInt(serviciosNoConciliados) - 1;

                                 opportunityRecord.setValue({
                                     fieldId: "custrecord_ptg_contador_sin_conciliar",
                                     value: serviciosNoConciliados
                                 });

                                 var savedOpportunity = opportunityRecord.save();
                                 log.debug("Update Contador", `Updated contador: id: ${oportunidadId} - Contador: ${serviciosNoConciliados}`);

                                 // Guardar
                                 let servicioConciliado = record.load({
                                     type: "customrecord_ptg_registros_sin_conciliar",
                                     id: servicio_id
                                 });

                                 servicioConciliado.setValue({
                                     fieldId: "custrecord_ptg_sgcloc_opor_noconcil",
                                     value: oportunidadId
                                 });

                                 servicioConciliado.save();
                                 // }

                             } catch (error) {
                                 log.error("Error loading record: ", error);
                             }
                         } else {
                             log.audit('No se encontró oportunidad para el servicio:', servicio_id);
                         }
                     } else {
                         log.audit('No se encontró vehículo para el servicio:', servicio_id);
                     }

                 });
             }
             log.audit('Se actualizaron las oportunidades', oportunidadesAfectadas);
             log.audit(`Script finalizado en ${Date.now() - hora} ms`);

         } catch (error) {
             log.debug('Error scheduled:', error)
         }
     }
     return { execute }
 });