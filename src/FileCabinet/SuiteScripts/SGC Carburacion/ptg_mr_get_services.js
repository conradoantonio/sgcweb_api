/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
 define(['N/file', 'N/format', 'N/http', 'N/https', 'N/record', 'N/search', 'N/xml', 'N/runtime', 'N/task', 'SuiteScripts/dev/moment'],
 /**
* @param{file} file
* @param{format} format
* @param{http} http
* @param{https} https
* @param{record} record
* @param{search} search
* @param{xml} xml
* @param{runtime} runtime
* @param{task} task
*/
 (file, format, http, https, record, search, xml, runtime, task, moment) => {
     /**
      * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
      * @param {Object} inputContext
      * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
      *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
      * @param {Object} inputContext.ObjectRef - Object that references the input data
      * @typedef {Object} ObjectRef
      * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
      * @property {string} ObjectRef.type - Type of the record instance that contains the input data
      * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
      * @since 2015.2
      */

    const getInputData = (inputContext) => {
        try {
            const index  = Number(runtime.getCurrentScript().getParameter({ name: 'custscript_ptg_contador' }));
            const folios = getFolios();

            let headers  = [];
            let postData = {
                "ip"       : folios[index].ip,
                "user"     : folios[index].apiUser,
                "folio"    : Number(folios[index].contador)+1,
                "password" : folios[index].apiPass
            };

            postData = JSON.stringify(postData);
            headers['Content-Type'] = 'application/json';

            const URL = 'https://i-ptg-sgclc-middleware-api-dtt-middleware.apps.mw-cluster.kt77.p1.openshiftapps.com/api/carburacion/procesarPeticion';
            const response = https.post({
                url: URL,
                headers: headers,
                body: postData
            });
            let responseJson = JSON.parse(response.body);
            let services     = responseJson.servicios;
            
            services.forEach(service => {
                service.numFolio = folios[index].contador;
                service.folioId  = folios[index].id;
                service.plantaId = folios[index].plantaId;
            });

            return services;
        } catch (error) {
            log.debug('Algo salió mal en el método get input data', error);
        }
    }

    /**
     * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
     * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
     * context.
     * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
     *     is provided automatically based on the results of the getInputData stage.
     * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
     *     function on the current key-value pair
     * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
     *     pair
     * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {string} mapContext.key - Key to be processed during the map stage
     * @param {string} mapContext.value - Value to be processed during the map stage
     * @since 2015.2
     */

    const map = (mapContext) => {
         
        try {
            const currency       = 1;
            const tipoServicio   = 3;// Carburación
            const entityStatus   = 13;
            const customForm     = ( runtime.envType === runtime.EnvType.PRODUCTION ? 264   : 307 );
            const productgasLpId = ( runtime.envType === runtime.EnvType.PRODUCTION ? 4216  : 4088 );
            const publicoGeneral = ( runtime.envType === runtime.EnvType.PRODUCTION ? 27041 : 14508 );
            const item           = JSON.parse(mapContext.value);
            const producto       = item.producto.trim() == 'GLP' ? 'GLP' : null;
            const bomba          = item.dispensador == 1 ? 1 : 2;
            
            // Si no es producto de gas lp, no se registra el servicio
            if (! producto ) { return; }
            
            let newOpp = record.create({
                type: record.Type.OPPORTUNITY,
            });
            
            newOpp.setValue({fieldId:'custbody_ptg_tipo_servicio', value: tipoServicio});
             
            // Campos en clasificación
            newOpp.setValue({fieldId:'custbody_ptg_bomba_despachadora', value: bomba});
            newOpp.setText({fieldId:'custbody_ptg_opcion_pago_obj', text: setMetodoPago(item.tipo_pago == 'Contado' ? 1 : 2, item.importe_total ?? 0)});
            newOpp.setValue({fieldId:'customform', value: customForm});
            newOpp.setValue({fieldId:'entity', value: publicoGeneral});
            newOpp.setValue({fieldId:'entitystatus', value: entityStatus});
            newOpp.setValue({fieldId:'currency', value: currency});

            // Estación de carburación
            if ( item.plantaId ) {
                newOpp.setValue({fieldId:'custbody_ptg_estacion_carburacion', value: Number( item.plantaId )});
            }

            // Campos sgc carburación
            newOpp.setText({fieldId:'custbody_ptg_vendedor_', text: item.vendedor });
            newOpp.setValue({fieldId:'custbody_ptg_tota_inicial_', value: parseFloat(item.totalizador_inicial ?? 0).toFixed(4)});
            newOpp.setValue({fieldId:'custbody_ptg_totalizador_final_', value: parseFloat(item.totalizador_final ?? 0).toFixed(4) });
            newOpp.setValue({fieldId:'custbody_ptg_tipopago_carburacion_', value: item.tipo_pago == 'Contado' ? 1 : 2});
            newOpp.setValue({fieldId:'custbody_ptg_estacion_', value: 2});
            newOpp.setValue({fieldId:'custbody_ptg_idcliente_', value: publicoGeneral});// Id cliente
            newOpp.setValue({fieldId:'custbody_ptg_folio_carburacion_', value: item.folio});
            newOpp.setText({fieldId:'custbody_ptg_dispensador_', text: item.dispensador });
            // newOpp.setValue({fieldId:'custbody_ptg_equipo_', value: 645});
            newOpp.setText({fieldId:'custbody_ptg_servicio_id', text: item.servicio_id });
            newOpp.setText({fieldId:'custbody_ptg_folio_ticket', text: item.folio_ticket });
            newOpp.setText({fieldId:'custbodyptg_inicio_servicio', text: item.inicio_servicio });
            newOpp.setText({fieldId:'custbodyptg_fin_servicio', text: item.fin_servicio });
            newOpp.setText({fieldId:'custbody_ptg_merma', text: item.merma });
            newOpp.setText({fieldId:'custbody_ptg_vale_electronico', text: item.vale_electronico });
            newOpp.setText({fieldId:'custbody_ptg_odometro', text: item.odometro });
            newOpp.setText({fieldId:'custbody_ptg_tipo_registro', text: item.tipo_registro });
            newOpp.setText({fieldId:'custbody_ptg_numero_impresiones', text: item.numero_impresiones });
            newOpp.setText({fieldId:'custbody_ptg_turno', text: item.turno });
            newOpp.setText({fieldId:'custbody_ptg_autoconsumo', text: item.autoconsumo });
            
            // Se agrega el producto de Gas LP a nivel artículo
            newOpp.setSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: 0,
                value: productgasLpId
            });
            newOpp.setSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: 0,
                value: item.cantidad ?? 0
            });
            newOpp.setSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                line: 0,
                value: item.valor_unitario ?? 0
            });
 
            const oppId = newOpp.save();

            log.debug('Info', 'Opotunidad guardada exitósamente: '+oppId);
             
            // Se actualiza el folio recién procesado
            let contadorFolio = record.load({isDynamic : true, type: 'customrecord_ptg_folio_counter', id : item.folioId});
             
            contadorFolio.setValue({fieldId: 'custrecord_ptg_folio_counter', value: item.folio});
             
            const folioId = contadorFolio.save();
             
            log.debug('Folio contador actualizado exitósamente', folioId);
        } catch (error) {
            log.debug('Algo salió mal', error);
        }
     }

    /**
     * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
     * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
     * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
     *     provided automatically based on the results of the map stage.
     * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
     *     reduce function on the current group
     * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
     * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {string} reduceContext.key - Key to be processed during the reduce stage
     * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
     *     for processing
     * @since 2015.2
     */
    const reduce = (reduceContext) => {
        log.debug('reduce', reduceContext);
    }


    /**
     * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
     * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
     * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
     * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
     *     script
     * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
     * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
     * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
     * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
     *     script
     * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
     * @param {Object} summaryContext.inputSummary - Statistics about the input stage
     * @param {Object} summaryContext.mapSummary - Statistics about the map stage
     * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
     * @since 2015.2
     */
    const summarize = (summaryContext) => {
        const folios     = getFolios();
        const lengthData = folios.length - 1;
        const index      = Number(runtime.getCurrentScript().getParameter({ name: 'custscript_ptg_contador' }));
        log.debug('Folios length', lengthData);
        //let index = Number(reduceContext.key);
        if ( index == folios.length - 1 ) {// Ya se terminó de procesar todas y cada una de las plantas
            log.debug('Proceso terminado', 'no tiene mas data por procesar');
        } else {
            const newIndex = index + 1;
            log.debug('Tiene más data por procesar de otra planta', lengthData);
            log.debug('newIndex', newIndex);
            task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: runtime.getCurrentScript().id,
                deploymentId: runtime.getCurrentScript().deploymentId,
                params: {
                    custscript_ptg_contador: newIndex,
                }
            }).submit();
        }
    }

    // Configura el json del método de pago
    const setMetodoPago = (tipoPago, monto) => {
        const arrPagos = [
            {
                "metodo_txt":tipoPago == 1 ? 'Efectivo' : 'Crédito',
                "tipo_pago":tipoPago,
                "tipo_cuenta":null,
                "tipo_tarjeta":null,
                "monto":monto,
                "folio":"",
            }
        ];

        const objPago = {
            "pago":arrPagos
        };

        return JSON.stringify(objPago);
    }

     // Obtiene todos los folios por ubicaciones
    const getFolios = () => {
        let foliosArray = [];
        var customrecord_ptg_folio_counterSearchObj = search.create({
            type: "customrecord_ptg_folio_counter",
            filters:
            [
                ["custrecord_ptg_folio_activo","is","T"]
            ],
            columns:
            [
                search.createColumn({
                    name: "scriptid",
                    sort: search.Sort.ASC,
                    label: "ID de script"
                }),
                search.createColumn({name: "internalid", label: "ID interno"}),
                search.createColumn({name: "custrecord_ptg_folio_counter", label: "Contador"}),
                search.createColumn({name: "custrecord_ptg_planta", label: "Ubicación"}),
                search.createColumn({name: "custrecord_ptg_ip_sgc_carb", label: "PTG IP SGC"}),
                search.createColumn({name: "custrecord_ptg_folio_sgc_carb_api_user", label: "API USER"}),
                search.createColumn({name: "custrecord_ptg_folio_sgc_carb_api_pass", label: "API PASSWORD"}),
                search.createColumn({
                    name: "internalid",
                    join: "CUSTRECORD_PTG_PLANTA",
                    label: "ID interno"
                })
            ]
        });
        // var searchResultCount = customrecord_ptg_folio_counterSearchObj.runPaged().count;
        customrecord_ptg_folio_counterSearchObj.run().each(function(result) {
            let resDiscount = result.getAllValues();
            
            let obj = {
                id       : resDiscount.internalid[0].value,
                contador : resDiscount.custrecord_ptg_folio_counter, 
                plantaId : resDiscount.custrecord_ptg_planta[0].value, 
                ip       : resDiscount.custrecord_ptg_ip_sgc_carb,
                apiUser  : resDiscount.custrecord_ptg_folio_sgc_carb_api_user,
                apiPass  : resDiscount.custrecord_ptg_folio_sgc_carb_api_pass,
            };
            foliosArray.push(obj);

            return true;
        });
          
        return foliosArray;
     }

     return {getInputData, map, reduce, summarize}

 });
