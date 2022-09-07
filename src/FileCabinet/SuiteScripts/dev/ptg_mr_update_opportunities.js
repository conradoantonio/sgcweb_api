/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/file', 'N/http', 'N/https', 'N/record', 'N/search', 'N/xml', 'N/runtime', 'N/task', 'SuiteScripts/dev/moment'],
    /**
 * @param{file} file
 * @param{http} http
 * @param{https} https
 * @param{record} record
 * @param{search} search
 * @param{xml} xml
 */
    (file, http, https, record, search, xml, runtime, task, moment) => {
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
                let index = Number(runtime.getCurrentScript().getParameter({ name: 'custscriptptg_index_sgc_web_mr' }));
                // log.debug('Index', index);
    
                let folios = getFoliosSgcWeb();
                log.debug('Folios array', folios);
                // Se verifica que tenga folios disponibles para hacer una petición a SGC web
                if ( folios.length && folios[index] ) {
                    let idToken = login();
                    let internalFileId = searchXmlFile(search);
                    let xmlContent = file.load({ id: internalFileId }).getContents();
                    let dataToSend = setServiceData(Number(folios[index].folio) + 1, 10);
                    let typeModule = "Servicios";
                    let action = "obtenerListaPorFolio";
                    let responseServ = registerSgcData(xmlContent, idToken, typeModule, action, dataToSend);
        
                    /**
                     * Si se obtiene información de los folios a procesar, caso contrario, significa que no hay folios nuevos y no se itera el map
                     */
                    if (["1111", "0000"].includes(responseServ.code[0].textContent) ) {
                        let servicesValues = JSON.parse(responseServ.info[0].textContent);

                        servicesValues.forEach(service => {
                            service.numFolio      = folios[index].folio;
                            service.folioId       = folios[index].id;
                            service.subsidiaria   = folios[index].subsidiaria;
                            service.subsidiariaId = folios[index].subsidiaria;
                        });
                        // log.debug('Services values', servicesValues);
                        // log.debug('Services lenght', servicesValues.length);
                        return servicesValues;
                    } else {
                        log.debug('Info', 'No hay servicios por validar');
                        return [];
                    }
    
                } else {
                    return [];
                }
            } catch (error) {
                log.debug('Error en get input data', error);
                return [];
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
                let currency         = 1;
                let tipoServicio     = 2;// Estacionario
                let statusPedido     = 3;// Entregado
                let entityStatus     = 13;// Concretado
                let tipoSgc          = 1;// SGC WEB
                const customForm     = ( runtime.envType === runtime.EnvType.PRODUCTION ? 265   : 305 );// Oportunidad-Potogas
                const productgasLpId   = ( runtime.envType === runtime.EnvType.PRODUCTION ? 4216  : 4088 );
                const publicoGeneral   = ( runtime.envType === runtime.EnvType.PRODUCTION ? 27041 : 14508 );
                // let customform       = 305;// Oportunidad-Potogas
                // let productgasLpId   = 4088;
                // let publicoGeneral   = 14508;
                let viajeActivo      = null;
                let numViajesActivos = [];
                let element          = JSON.parse(mapContext.value);
                let unidadSgc        = element.unidad ? element.unidad.identificador_externo : null;
                let equipo           = null;
                if ( unidadSgc ) {
                    numViajesActivos = getNumeroViajesActivos(unidadSgc);
                    equipo           = getEquipoSgc(unidadSgc);
                    if ( numViajesActivos.length > 0 ) {
                        viajeActivo = numViajesActivos[0].idViaje;
                    }
                }
                log.debug('equipo', equipo);

                let tipoPago = element.tipo_pago == 1 ? 1 : 2;
                let tipoServ = ( element.tipo_registro == 'D' ? 1 : ( element.tipo_registro == 'J' ? 2 : element.tipo_registro == 'A' ? 3 : 1 ) );
                let iva      = Number(element.tasa_impuesto);
                let subtotal = parseFloat( Number(element.cantidad) * Number(element.valor_unitario) ).toFixed(2);
                let total    = parseFloat( subtotal * ( ( iva / 100 ) + 1) ).toFixed(2);
                subtotal     = parseFloat(subtotal).toFixed(4);
                total        = parseFloat(total).toFixed(4);
                // log.debug('iva', iva);
                // log.debug('subtotal', subtotal);
                // log.debug('total', total);
                // return;
                let registroLineaEst = record.create({type: "customrecord_ptg_registro_servicios_es_l"});

                if ( equipo.length ) {
                    registroLineaEst.setValue({fieldId:'custrecord_ptg_ruta_sin_conciliar_2', value: equipo[0].id});// PTG - Equipo ID
                    registroLineaEst.setValue({fieldId:'custrecord_ptg_planta_sin_conciliar_2', value: equipo[0].plantaId});// Planta ID
                }
                
                registroLineaEst.setValue({fieldId:'custrecord_ptg_cliente_reg_serv_est_lin', value: publicoGeneral});// Cliente
                registroLineaEst.setText({fieldId:'custrecord_ptg_cantidad_reg_serv_est_lin', text: element.cantidad});// Cantidad de litros surtidos
                registroLineaEst.setText({fieldId:'custrecord_ptg_cant_old_reg_serv_est_lin', text: element.cantidad});// Cantidad de litros surtidos
                registroLineaEst.setValue({fieldId:'custrecord_ptg_articulo_reg_serv_est_lin', value: productgasLpId });// GAS LP
                registroLineaEst.setText({fieldId:'custrecord_ptg_litros_sin_conciliar_2', text: element.cantidad});// Cantidad de litros surtidos
                registroLineaEst.setText({fieldId:'custrecord_ptg_precio_reg_serv_est_lin', text: element.valor_unitario});// Precio Unitario sin IVA
                registroLineaEst.setText({fieldId:'custrecord_ptg_impuesto_reg_serv_est_lin', text: iva});// IVA
                registroLineaEst.setText({fieldId:'custrecord_ptg_subtotal_registro_servs_e', text: subtotal});// Costo del servicio sin IVA
                registroLineaEst.setText({fieldId:'custrecord_ptg_total_reg_serv_est_lin', text: total});// Costo total del servicio con IVA
                registroLineaEst.setText({fieldId:'custrecord_ptg_folio_aut_2_', text: element.folio});// Folio
                registroLineaEst.setText({fieldId:'custrecord_ptg_folio_reg_sin_c_2', text: element.folio});// Folio
                registroLineaEst.setText({fieldId:'custrecord_ptg_folio_sgc_2_', text: element.folio});// Folio
                registroLineaEst.setText({fieldId:'custrecord_ptg_sgcloc_fecha_2_', text: setCustomDate(element.fecha_inicio, 'D/M/YYYY') });// Fecha de inicio del servicio 
                registroLineaEst.setText({fieldId:'custrecord_ptg_sgcloc_hora_2_', text: setCustomDate(element.fecha_inicio, 'h:mm:ss') });// Hora de inicio del servicio 
                registroLineaEst.setText({fieldId:'custrecord_ptg_fechainicio_sgc_2_', text: setCustomDate(element.fecha_inicio, 'D/M/YYYY h:mm:ss a') });// Hora de inicio del servicio 
                registroLineaEst.setText({fieldId:'custrecord_fecha_final_sgc_2_', text: setCustomDate(element.fecha_fin, 'D/M/YYYY h:mm:ss a') });// Hora de inicio del servicio 
                registroLineaEst.setValue({fieldId:'custrecord_ptg_tipodeservicio_2_', value: tipoServ });// Tipo de servicio (Venta, Jarreo, AutoJarreo)
                registroLineaEst.setText({fieldId:'custrecord_ptg_foliounidad_sgc_2_', text: element.folio_unidad});// Folio unidad
                registroLineaEst.setText({fieldId:'custrecord_ptg_totalizador_inicia_sgc_2', text: element.totalizador_inicial});// Totalizador inicial
                registroLineaEst.setText({fieldId:'custrecord_totalizador_final_sgc_2_', text: element.totalizador_final});// Totalizador final
                registroLineaEst.setValue({fieldId:'custrecord_ptg_tipo_de_pago_sgc_2_', value: tipoPago });// Tipo de pago (Contado, crédito)
                registroLineaEst.setValue({fieldId:'custrecord_ptg_tipo_sgc_2_', value: 1 });// Tipo de SGC, se setea el web 

                let registroLineaEstId = registroLineaEst.save();
                log.debug('Registro de de línea estacionario id guardado exitósamente', registroLineaEstId);

                updateFolioSgcWeb(element.folioId, element.folio);

                return;
                let oppByFolio = searchOpp(element, 'folio');
                // let tipoPago = element.tipo_pago == 1 ? 1 : 2;
                // let tipoServ = ( element.tipo_registro == 'D' ? 1 : ( element.tipo_registro == 'J' ? 2 : element.tipo_registro == 'A' ? 3 : 1 ) );
                log.debug('oppByFolio', oppByFolio);
                // Si no hay ninguna oportunidad con ese folio, se crea un registro de conciliación
                if (! oppByFolio.length ) {
                    // let oppByCriteria = searchOpp(element, 'criteria');
                    // log.debug('No hay opp con folio', 'Se debe buscar una oportunidad que coincida con la subsidiaria, ruta y cliente');
                    // log.debug('oppByCriteria', oppByCriteria);
                    try {
                        let noConciliado = record.create({type: "customrecord_ptg_registros_sin_conciliar"});
                        
                        // Si encuentra el registro en netsuite de la unidad de SGC, se setean los datos ruta y planta
                        if ( equipo.length ) {
                            noConciliado.setValue({fieldId:'custrecord_ptg_ruta_sin_conciliar', value: equipo[0].id});// PTG - Equipo ID
                            noConciliado.setValue({fieldId:'custrecord_ptg_planta_sin_conciliar', value: equipo[0].plantaId});// Planta ID
                        }
                        noConciliado.setText({fieldId:'custrecord_ptg_litros_sin_conciliar', text: element.cantidad});// Cantidad de litros surtidos
                        noConciliado.setText({fieldId:'custrecord_ptg_total_ser_sin_conciliar', text: element.valor_unitario});// Precio Unitario sin IVA
                        // noConciliado.setText({fieldId:'custrecord_ptg_folio_reg_sin_conciliar', text: element.folio});// Folio
                        noConciliado.setText({fieldId:'custrecord_ptg_folio_sgc_', text: element.folio});// Folio
                        noConciliado.setText({fieldId:'custrecordcustrecord_ptg_folio_reg_sin_c', text: element.folio});// Folio
                        noConciliado.setText({fieldId:'custrecord_ptg_sgcloc_fecha', text: setCustomDate(element.fecha_inicio, 'D/M/YYYY') });// Fecha de inicio del servicio 
                        noConciliado.setText({fieldId:'custrecord_ptg_sgcloc_hora', text: setCustomDate(element.fecha_inicio, 'h:mm:ss') });// Hora de inicio del servicio 
                        noConciliado.setText({fieldId:'custrecord_ptg_fechainicio_sgc', text: setCustomDate(element.fecha_inicio, 'D/M/YYYY h:mm:ss a') });// Hora de inicio del servicio 
                        noConciliado.setText({fieldId:'custrecord_fecha_final_sgc_', text: setCustomDate(element.fecha_fin, 'D/M/YYYY h:mm:ss a') });// Hora de inicio del servicio 
                        noConciliado.setValue({fieldId:'custrecord_ptg_tipodeservicio_', value: tipoServ });// Tipo de servicio (Venta, Jarreo, AutoJarreo)
                        noConciliado.setText({fieldId:'custrecord_ptg_foliounidad_sgc', text: element.folio_unidad});// Folio unidad
                        noConciliado.setText({fieldId:'custrecord_ptg_totalizador_inicial_sgc', text: element.totalizador_inicial});// Totalizador inicial
                        noConciliado.setText({fieldId:'custrecord_totalizador_final_sgc_', text: element.totalizador_final});// Totalizador final
                        noConciliado.setValue({fieldId:'custrecord_ptg_tipo_de_pago_sgc_', value: tipoPago });// Tipo de pago (Contado, crédito)
                        noConciliado.setValue({fieldId:'custrecord_ptg_tipo_sgc', value: 1 });// Tipo de SGC, se setea el web 
    
                        let noConciliadoId = noConciliado.save();
                        log.debug('Registro de no conciliado guardado exitósamente', noConciliadoId);

                        updateFolioSgcWeb(element.folioId, element.folio);

                        return;
                    } catch (error) {
                        log.debug('Error al guardar registro de no conciliado', error);
                    }
                } 
                /**
                 * Si la búsqueda encuentra una oportunidad 
                 * y la oportunidad tiene un status diferente de concretado
                 * y el status del pedido es distinto a entregado, se actualiza la oportunidad
                 */
                // else {// PARCHE PARA ACTUALIZAR TEMPORALMENTE LA OPORTUNIDAD
                else if ( oppByFolio[0].entityStatusId != entityStatus && oppByFolio[0].estadoPedidoId != statusPedido) { 
                    log.debug('Hay opp con este folio', 'Se actualiza la opp');
                    try {
                        // return;
                        let oppRecord = record.load({id : oppByFolio[0].id, type: record.Type.OPPORTUNITY});
                        // log.debug('Respuesta sgcweb obtener lista por folio', responseServ.info);
                        // log.debug('Respuesta sgcweb en json', servicesValues);
                        // log.debug('SGC', 'Servicios consultados exitósamente');

                        oppRecord.setText({fieldId:'custbody_ptg_folio_sgc_', text: element.folio});
                        // oppRecord.setText({fieldId:'custbody_ptg_fechainicio_sgc', text: element.fecha_inicio});
                        oppRecord.setText({fieldId:'custbody_ptg_fechainicio_sgc', text: parseDateSgc(element.fecha_inicio)});
                        oppRecord.setText({fieldId:'custbody_fecha_final_sgc_', text: parseDateSgc(element.fecha_fin)});
                        oppRecord.setValue({fieldId:'custbody_ptg_tipodeservicio_', value: tipoServ });
                        oppRecord.setText({fieldId:'custbody_ptg_foliounidad_sgc', text: element.folio_unidad});
                        oppRecord.setText({fieldId:'custbody_ptg_totalizador_inicial_sgc', text: element.totalizador_inicial});
                        oppRecord.setText({fieldId:'custbody_totalizador_final_sgc_', text: element.totalizador_final});
                        oppRecord.setValue({fieldId:'custbody_ptg_tipo_de_pago_sgc_', value: tipoPago});
                        oppRecord.setValue({fieldId:'custbody_ptg_estado_pedido', value: statusPedido});
                        oppRecord.setValue({fieldId:'entitystatus', value: entityStatus});
                        // oppRecord.setValue({fieldId:'custbody_ptg_tipo_sgc', value: tipoSgc});// Se indica que el registro es de SGC web

                        // Sólo se setea el número de viaje si es que existe
                        if ( viajeActivo ) {
                            oppRecord.setValue({fieldId:'custbody_ptg_numero_viaje', value: viajeActivo});
                        }
                        
                        oppRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            line: 0,
                            value: Number(element.cantidad)
                        });

                        oppRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                            line: 0,
                            value: Number(parseFloat(element.valor_unitario).toFixed(2))
                        });
        
                        oppRecord.save();
                        
                        log.debug('Info', 'Registro actualizado exitósamente '+oppRecord.id);

                        // Se actualiza el folio recién guardado
                        updateFolioSgcWeb(element.folioId, element.folio);

                        return;
                        
                    } catch (error) {
                        log.debug('Error al actualizar opp', error);
                    }
                } else {
                    log.debug('Info', 'Existe una oportunidad con este folio, pero ya fue actualizado ');
                    updateFolioSgcWeb(element.folioId, element.folio);
                }
                return;
            } catch (error) {
                log.debug('Error', error);
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

        }

        // Try to login 
        const login = () => {
            let res;
            
            let fileSearchObj = search.create({
                type: "file",
                filters:
                    [
                        ["name", "haskeywords", "login"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "name",
                            sort: search.Sort.ASC,
                            label: "Name"
                        }),
                        search.createColumn({ name: "folder", label: "Folder" }),
                        search.createColumn({ name: "documentsize", label: "Size (KB)" }),
                        search.createColumn({ name: "url", label: "URL" }),
                        search.createColumn({ name: "created", label: "Date Created" }),
                        search.createColumn({ name: "modified", label: "Last Modified" }),
                        search.createColumn({ name: "filetype", label: "Type" }),
                        search.createColumn({ name: "internalid", label: "Internal ID" })
                    ]
            });
            
            // let searchResultCount = fileSearchObj.runPaged().count;
            // log.debug("fileSearchObj result count", searchResultCount);
            fileSearchObj.run().each(function (result) {
                // log.debug('Resultado petición', result);
                // .run().each has a limit of 4,000 results
                res = result.getValue({ name: "internalid", label: "Internal ID" });
                return true;
            });

            let xmlContent = file.load({ id: res }).getContents();
            // log.debug('xmlContent', xmlContent);

            let headers = {};
            headers['Content-Type'] = 'text/xml; charset=utf-8';
            // headers['SOAPAction'] = 'http://testpotogas.sgcweb.com.mx/ws/1094AEV2/v2/soap.php/login';
            // let url = 'http://testpotogas.sgcweb.com.mx//ws/1094AEV2/v2/soap.php';
            headers['SOAPAction'] = 'http://potogas.sgcweb.com.mx/ws/1094AEV2/v2/soap.php/login';
            let url = 'http://potogas.sgcweb.com.mx/ws/1094AEV2/v2/soap.php';
            // Method, url, body, headers
            let response = http.request({ method: http.Method.POST, url: url, body: xmlContent, headers: headers });
            // log.debug('response', response.body)
            let xmlFileContent = response.body;
            let xmlDocument = xml.Parser.fromString({ text: xmlFileContent });
            let dataJson = xmlDocument.getElementsByTagName({ tagName: 'id' });
            // log.debug('response status', dataJson)
            let objResult = dataJson[0].textContent;
            // log.debug('objResult', objResult)
            return objResult;
        }

        // Busqueda guardada para obtener el archivo xml de peticiones a la api de SGC web
        const searchXmlFile = (search) => {
            let internalFileId;
            let fileSearchObj = search.create({
                type: "file",
                filters:
                    [
                        ["name", "haskeywords", "procesarPeticion"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "name",
                            sort: search.Sort.ASC,
                            label: "Name"
                        }),
                        search.createColumn({ name: "folder", label: "Folder" }),
                        search.createColumn({ name: "documentsize", label: "Size (KB)" }),
                        search.createColumn({ name: "url", label: "URL" }),
                        search.createColumn({ name: "created", label: "Date Created" }),
                        search.createColumn({ name: "modified", label: "Last Modified" }),
                        search.createColumn({ name: "filetype", label: "Type" }),
                        search.createColumn({ name: "internalid", label: "Internal ID" })
                    ]
            });
            fileSearchObj.run().each(function (result) {
                // .run().each has a limit of 4,000 results
                internalFileId = result.getValue({ name: "internalid", label: "Internal ID" });
                return true;
            });

            return internalFileId;
        }

        // Configura los datos a enviar a SGC web
        const setDataOpportunity = (rowItem) => {
            // log.debug('info', 'entró a la función de configurar la información del producto');

            // let nombre            = ( type == 'edit' ? rowItem.getText({fieldId:'name'}) : aditionalCustomerInfo?.name );
            let fechaCreacion = horaCreacion = fechaDividida = horaDividida = horaMinDividida = fechaAtencion = anio = mes = dia = hora = min = isPm = horaMin = '';
            let trandate          = ( type == 'edit' ? rowItem.getValue({fieldId:'trandate'}) : rowItem.getValue({fieldId:'trandate'}) );
            let comentarios       = ( type == 'edit' ? rowItem.getValue({fieldId:'memo'}) : rowItem.getValue({fieldId:'memo'}) );
            // let estatus           = ( type == 'edit' ? rowItem.getValue({fieldId:'entitystatus'}) : rowItem.getValue({fieldId:'entitystatus'}) );
            // let rutaId            = ( type == 'edit' ? rowItem.getValue({fieldId:'custbody_route'}) : rowItem.getValue({fieldId:'custbody_route'}) );
            let motivoCancelacion = ( type == 'edit' ? rowItem.getText({fieldId:'custbody_ptg_motivo_cancelation'}) : rowItem.getValue({fieldId:'custbody_ptg_motivo_cancelation'}) );
            let entity            = ( type == 'edit' ? rowItem.getValue({fieldId:'entity'}) : rowItem.getValue({fieldId:'entity'}) );
            let articulos         = searchArticlesOpp(rowItem);

            if ( trandate ) {
                var formattedDateString = format.format({
                    value: trandate,
                    type: format.Type.DATETIME,
                    timezone: format.Timezone.AMERICA_MEXICO_CITY
                });
    
                trandate = formattedDateString.split(' ');
                fechaCreacion = trandate[0];
                horaCreacion = trandate[1];
            }

            if ( fechaCreacion ) {
                fechaDividida = fechaCreacion.split('/');
                dia  = fechaDividida[0];
                mes  = fechaDividida[1];
                anio = fechaDividida[2];

                if ( mes < 10 ) { mes = '0'.concat(mes); }

                fechaAtencion = anio+'-'+mes+'-'+dia;
            }

            if ( horaCreacion ) {
                horaDividida = horaCreacion.split(' ');
                horaMin      = horaDividida[0];
                isPm         = horaDividida[1];
                
                horaMinDividida = horaMin.split(':');
                hora = horaMinDividida[0];
                min  = horaMinDividida[1];

                if ( hora < 10 ) { hora = '0'.concat(hora); }
                fechaAtencion += ' '+hora+':'+min+':00';
            }

            let data = {
                // "folio":"",
                "identificador_externo": rowItem.id,
                "fecha_atencion":fechaAtencion,
                "fecha_servicio":"",
                "fecha_modificacion":"",
                "estatus":"",
                "comentarios":comentarios,
                "cantidad":articulos.length ? articulos[0].quantity : "0",
                "producto_id":articulos.length ? articulos[0].id : "1753",
                "precio_id":"",
                "usuario_asignado_id":"",
                "consumidor_id":entity,
                "lista_unidades_id":"",
                "ruta_id":"2051",
                // "ruta_id":rutaId,
                "motivo_cancelacion":motivoCancelacion,
            };

            log.debug('data armada: ', data);

            return data;
        }

        // Configura los datos a enviar para las políticas de consumo
        const setServiceData = (folio, quantity = 1) => {

            let data = {
         		"busqueda" : {
         			"folioPosicion":folio,
                    "cantidadElementos":quantity
                },
                "atributosVenta" : {
                    "folio":1,
                    "importe_total":1,
                    "fecha_inicio":1,
                    "fecha_fin":1,
                    "unidad_medida":1,
                    "cantidad":1,
                    "estado":1,
                    "tipo_registro":1,
                    "folio_unidad":1,
                    "totalizador_inicial":1,
                    "totalizador_final":1,
                    "tipo_pago":1,
                    "valor_unitario":1,
                    "subtotal":1,
                    "impuesto":1,
                    "tasa_impuesto":1,
                    "importe_impuesto":1,
                    "impuesto_extra":1,
                    "tasa_impuesto_extra":1,
                    "precio_unitario_neto":1,
                    "pedido":1,
                    "porcentaje_inicial":1,
                    "porcentaje_final":1,
                    "unidad":{ 
                        "nombre":1, 
                        "identificador_externo":1 
                    },
                    "cliente":{ 
                        "nombres":1, 
                        "identificador_externo":1 
                    },
                    "consumidor":{ 
                        "nombres":1, 
                        "identificador_externo":1 
                    }
                }
            };

            // log.debug('info obtener servicios', data);

            return data;
        }

        // Envía datos a sgc
        const registerSgcData = (xmlContent, idToken, typeModule, action, data) => {
            xmlContent = xmlContent.split('idSession').join(`${idToken}`);
            xmlContent = xmlContent.split('typeModule').join(`${typeModule}`);
            xmlContent = xmlContent.split('action').join(`${action}`);
            xmlContent = xmlContent.split('data').join(`${JSON.stringify(data)}`);

            // log.debug('despues del primer join', xmlContent);

            let headers = {};
            headers['Content-Type'] = 'text/xml; charset=utf-8';
            // headers['SOAPAction'] = 'http://testpotogas.sgcweb.com.mx/ws/1094AEV2/v2/soap.php/procesarPeticion';
            // let url = 'http://testpotogas.sgcweb.com.mx//ws/1094AEV2/v2/soap.php';
            headers['SOAPAction'] = 'http://potogas.sgcweb.com.mx/ws/1094AEV2/v2/soap.php/procesarPeticion';
            let url = 'http://potogas.sgcweb.com.mx/ws/1094AEV2/v2/soap.php';
            let response = http.request({ method: http.Method.POST, url: url, body: xmlContent, headers: headers });                    
            // log.debug('response', response.body)
            let xmlFileContent = response.body;
            let xmlDocument = xml.Parser.fromString({ text: xmlFileContent });
            let dataJson = xmlDocument.getElementsByTagName({ tagName: 'informacion' });
            let responseCode = xmlDocument.getElementsByTagName({ tagName: 'codigo' });
            // log.debug('response info', dataJson);
            // log.debug('response code', responseCode);

            return {
                info : dataJson,
                code : responseCode,
            };
            
        }

        // Obtiene el listado de oportunidades a actualizar por sgcweb
        const getOpportunities = () => {
            let oppArray = [];
            var opportunitySearchObj = search.create({
                type: "opportunity",
                filters:
                [
                    ["custbody_ptg_folio_aut","isnotempty",""], 
                    // ["custbody_ptg_folio_sgc_","isnotempty",""], 
                    "AND", 
                    ["custbody_ptg_estado_pedido","anyof","2"]
                ],
                columns:
                [
                    search.createColumn({name: "title", label: "Título"}),
                    search.createColumn({
                        name: "tranid",
                        sort: search.Sort.DESC,
                        label: "Número de documento"
                    }),
                    search.createColumn({name: "entity", label: "Cliente"}),
                    search.createColumn({name: "salesrep", label: "Representante de ventas"}),
                    search.createColumn({name: "trandate", label: "Fecha"}),
                    search.createColumn({name: "custbody_ptg_numero_viaje", label: "Número de Viaje"}),
                    search.createColumn({
                        name: "custrecord_ptg_vehiculo_tabladeviajes_",
                        join: "CUSTBODY_PTG_NUMERO_VIAJE",
                        label: "PTG - Vehiculo (Tabla de Viajes)"
                    }),
                    search.createColumn({name: "custbody_ptg_ruta_asignada", label: "PTG - RUTA ASIGNADA"}),
                    search.createColumn({name: "custbody_ptg_planta_relacionada", label: "PTG - PLANTA RELACIONADA AL PEDIDO"}),
                    search.createColumn({name: "expectedclosedate", label: "Cierre previsto"}),
                    search.createColumn({name: "custbody_ptg_estado_pedido", label: "PTG - ESTADO DEL PEDIDO"}),
                    search.createColumn({name: "forecasttype", label: "Tipo de pronóstico"}),
                    search.createColumn({name: "projectedtotal", label: "Total previsto"}),
                    search.createColumn({name: "internalid", label: "ID interno"}),
                    search.createColumn({name: "custbody_ptg_zonadeprecioop_", label: "PTG - Zona de precio Oportuidad"}),
                    search.createColumn({name: "custbody_ptg_folio_aut", label: "PTG - FOLIO DE AUTORIZACIÓN"}),
                    search.createColumn({name: "custbody_ptg_folio_sgc_", label: "PTG - Folio SGC"})
                ]
            });
            var searchResultCount = opportunitySearchObj.runPaged().count;
            // log.debug("opportunitySearchObj result count",searchResultCount);
            opportunitySearchObj.run().each(function(result) {
                let resValues = result.getAllValues();
                // log.debug('values', resValues);

                let obj = {
                    id         : resValues.internalid[0].value,
                    folioAut   : resValues.custbody_ptg_folio_aut,
                    folioSgc   : resValues.custbody_ptg_folio_sgc_,
                    zonaPrecio : resValues.custbody_ptg_zonadeprecioop_[0].text,
                };

                oppArray.push(obj);
                // .run().each has a limit of 4,000 results
                return true;
            });

            return oppArray;
        }

        // Configura el json del método de pago
        const setMetodoPago = (tipo_pago, monto) => {
            let arrPagos = [
                {
                    "metodo_txt":tipo_pago == 1 ? 'Efectivo' : 'Crédito',
                    "tipo_pago":tipo_pago,
                    "tipo_cuenta":null,
                    "tipo_tarjeta":null,
                    "monto":monto,
                    "folio":"",
                }
            ];
            // let arrPagos = [{"tipo_pago":"1","monto":100.8},{"tipo_pago":"2","monto":50}];
            let objPago = {
                "pago":arrPagos
            };

            return JSON.stringify(objPago);
        }

        // Formatea la fecha recibida desde sgc para hacerla compatible con netsuite, ejemplo resultado 27/7/2022 6:53:00 pm
        const parseDateSgc = (sgcDate) => {
            let formatedDate = null;
            let splitDate    = sgcDate.split(' ');
            if ( splitDate.length ) {
                let date = splitDate[0];
                let dateSplit = date.split('-');

                let time = splitDate[1];
                let timeSplit = time.split(':');
                // 00:08:33
                if ( timeSplit.length ) {
                    let hour = Number(timeSplit[0]);

                    if ( hour == 12 ) {
                        formatedDate = dateSplit[2]+'/'+dateSplit[1]+'/'+dateSplit[0]+' '+hour+':'+timeSplit[1]+':'+timeSplit[2]+' pm';
                    } else if ( hour == 00 ) {
                        hour = 12;
                        formatedDate = dateSplit[2]+'/'+dateSplit[1]+'/'+dateSplit[0]+' '+hour+':'+timeSplit[1]+':'+timeSplit[2]+' am';
                    }
                    else if ( hour > 12 ) {
                        hour = hour - 12;
                        formatedDate = dateSplit[2]+'/'+dateSplit[1]+'/'+dateSplit[0]+' '+hour+':'+timeSplit[1]+':'+timeSplit[2]+' pm';
                    } else {
                        formatedDate = dateSplit[2]+'/'+dateSplit[1]+'/'+dateSplit[0]+' '+hour+':'+timeSplit[1]+':'+timeSplit[2]+' am';
                    }
                }
                // 2021-11-02 18:30:32

            }

            return formatedDate;
        }

        // Método para actualizar el folio de sgc web
        const updateFolioSgcWeb = (id, folio) => {
            let contadorFolio = record.load({isDynamic : true, type: 'customrecordptg_folio_contador_sgc_web', id : id});
                                
            contadorFolio.setValue({fieldId: 'custrecordptg_folio_contador_sgc_web', value: Number(folio)});
            
            let folioId = contadorFolio.save();
            
            log.debug('Folio sgc web ID', folioId);

            return folioId;
        }

        // Obtiene los folios por sgc web ventas
        const getFoliosSgcWeb = () => {
            let foliosArray = [];
            var customrecordptg_folio_contador_sgc_webSearchObj = search.create({
                type: "customrecordptg_folio_contador_sgc_web",
                filters:
                [
                   ["isinactive","is","F"]
                ],
                columns:
                [
                    search.createColumn({
                        name: "scriptid",
                        sort: search.Sort.ASC,
                        label: "ID de script"
                    }),
                    search.createColumn({name: "custrecordptg_folio_contador_sgc_web", label: "Folio"}),
                    search.createColumn({name: "custrecordptg_folio_sgc_web_subsidiaria", label: "Subsidiaria"}),
                    search.createColumn({name: "custrecord_ptg_folio_sgc_web_url", label: "URL"}),
                    search.createColumn({name: "internalid", label: "ID interno"})
                ]
            });
            // var searchResultCount = customrecordptg_folio_contador_sgc_webSearchObj.runPaged().count;
            // log.debug("customrecordptg_folio_contador_sgc_webSearchObj result count",searchResultCount);
            customrecordptg_folio_contador_sgc_webSearchObj.run().each(function(result) {
                let values = result.getAllValues();
                let obj = {};

                obj.id            = Number(values.internalid[0].value);
                obj.folio         = Number(values.custrecordptg_folio_contador_sgc_web);
                obj.subsidiaria   = values.custrecordptg_folio_sgc_web_subsidiaria[0].text;
                obj.subsidiariaId = Number(values.custrecordptg_folio_sgc_web_subsidiaria[0].value);
                // log.debug('Values folios busqueda', values);
                foliosArray.push(obj);

                return true;
            });

            return foliosArray;
        }

        // Obtiene las oportunidades acorde a un folio o criterios personalizados
        const searchOpp = (service, type) => {
            let filters = null;
            if ( type == 'folio' ) {
                filters = [
                    ["custbody_ptg_folio_aut","is",service.folio]
                ];
            } else if('criteria') {
                filters = [
                    ["custbody_ptg_numero_viaje.custrecord_ptg_id_vehiculo_sgc","startswith","57"], 
                    "AND", 
                    ["subsidiary","anyof","25"], 
                    "AND", 
                    ["entitystatus","anyof","11"], 
                    "AND", 
                    ["custbody_ptg_estado_pedido","anyof","2"], 
                    "AND", 
                    ["custbody_ptg_planta_relacionada","anyof","762"]
                ];
            }
            let oppArray = [];
            var opportunitySearchObj = search.create({
                type: "opportunity",
                filters: filters,
                columns:
                [
                    search.createColumn({name: "title", label: "Título"}),
                    search.createColumn({
                        name: "tranid",
                        sort: search.Sort.DESC,
                        label: "Número de documento"
                    }),
                    search.createColumn({name: "entity", label: "Cliente"}),
                    search.createColumn({name: "salesrep", label: "Representante de ventas"}),
                    search.createColumn({name: "trandate", label: "Fecha"}),
                    search.createColumn({name: "custbody_ptg_numero_viaje", label: "Número de Viaje"}),
                    search.createColumn({name: "custbody_ptg_ruta_asignada", label: "PTG - RUTA ASIGNADA"}),
                    search.createColumn({name: "custbody_ptg_planta_relacionada", label: "PTG - PLANTA RELACIONADA AL PEDIDO"}),
                    search.createColumn({name: "expectedclosedate", label: "Cierre previsto"}),
                    search.createColumn({name: "custbody_ptg_estado_pedido", label: "PTG - ESTADO DEL PEDIDO"}),
                    search.createColumn({name: "projectedtotal", label: "Total previsto"}),
                    search.createColumn({name: "internalid", label: "ID interno"}),
                    search.createColumn({name: "custbody_ptg_precio_articulo_zona", label: "PTG - PRECIO DEL ARICULO EN LA ZONA"}),
                    search.createColumn({name: "custbody_ptg_zonadeprecioop_", label: "PTG - Zona de precio Oportuidad"}),
                    search.createColumn({name: "custbody_ptg_folio_aut", label: "PTG - FOLIO DE AUTORIZACIÓN"}),
                    search.createColumn({name: "custbody_ptg_folio_sgc_", label: "PTG - Folio SGC"}),
                    search.createColumn({
                        name: "custrecord_ptg_vehiculo_tabladeviajes_",
                        join: "CUSTBODY_PTG_NUMERO_VIAJE",
                        label: "PTG - Vehiculo (Tabla de Viajes)"
                    }),
                    search.createColumn({name: "entitystatus", label: "Estado de oportunidad"})
                ]
            });
            
            opportunitySearchObj.run().each(function(result) {
                let values = result.getAllValues();
                let obj = {};

                obj.id             = Number(values.internalid[0].value);
                obj.estadoPedidoId = Number(values.custbody_ptg_estado_pedido[0].value);
                obj.estadoPedido   = values.custbody_ptg_estado_pedido[0].text;
                obj.entityStatusId = Number(values.entitystatus[0].value);
                obj.entityStatus   = values.entitystatus[0].text;
                // obj.plantaId       = Number(values.custbody_ptg_planta_relacionada[0].value);
                
                // log.debug('Values', values);
                oppArray.push(obj);

                return true;
            });

            return oppArray;
        }

        // Obtiene los número de viajes activos
        const getNumeroViajesActivos = (unidadSgc) => {
            try {
                let rowArray = [];
                var customrecord_ptg_tabladeviaje_enc2_SearchObj = search.create({
                    type: "customrecord_ptg_tabladeviaje_enc2_",
                    filters:
                    [
                        ["custrecord_ptg_viajeactivo_","is","T"], 
                        "AND", 
                        ["custrecord_ptg_servicioestacionario_","is","T"], 
                        "AND", 
                        ["custrecord_ptg_id_vehiculo_sgc","is",unidadSgc]
                    ],
                    columns:
                    [
                        search.createColumn({name: "name", label: "Nombre"}),
                        search.createColumn({name: "id", label: "ID"}),
                        search.createColumn({name: "custrecord_ptg_vehiculo_tabladeviajes_", label: "PTG - Vehiculo (Tabla de Viajes)"}),
                        search.createColumn({name: "custrecord_ptg_viaje_tabladeviajes_", label: "PTG - #Viaje (Tabla de viajes)"}),
                        search.createColumn({name: "custrecord_ptg_planta_tabladeviajes_", label: "PTG - Planta (Tabla de viajes)"}),
                        search.createColumn({name: "custrecord_ptg_chofer_tabladeviajes_", label: "PTG - Chofer (Tabla de viajes)"}),
                        search.createColumn({name: "custrecord_ptg_ruta", label: "PTG - Ruta"}),
                        search.createColumn({name: "custrecord_ptg_id_vehiculo_sgc", label: "PTG - ID VEHICULO SGC"})
                    ]
                });
                var searchResultCount = customrecord_ptg_tabladeviaje_enc2_SearchObj.runPaged().count;
                // log.debug("customrecord_ptg_tabladeviaje_enc2_SearchObj result count",searchResultCount);
                customrecord_ptg_tabladeviaje_enc2_SearchObj.run().each(function(result) {
                    let values = result.getAllValues();
                    // log.debug('values busqueda viajes activos', values);
                    let obj = {};

                    obj.idViaje = Number(values.id);
                    obj.vehiculoSgc = values.custrecord_ptg_id_vehiculo_sgc;
                    // obj.estadoPedidoId = Number(values.custbody_ptg_estado_pedido[0].value);
                    // obj.estadoPedido   = values.custbody_ptg_estado_pedido[0].text;
                    // obj.entityStatusId = Number(values.entitystatus[0].value);
                    // obj.entityStatus   = values.entitystatus[0].text;
                    // obj.plantaId       = Number(values.custbody_ptg_planta_relacionada[0].value);
                    
                    // log.debug('Values', values);
                    rowArray.push(obj);

                    // .run().each has a limit of 4,000 results
                    return true;
                });

                return rowArray;
            } catch (error) {
                log.debug('Error en obtener viajes activos', error);
            }
             
             /*
             customrecord_ptg_tabladeviaje_enc2_SearchObj.id="customsearch1660786278382";
             customrecord_ptg_tabladeviaje_enc2_SearchObj.title="PTG - Viajes SGC (copy)";
             var newSearchId = customrecord_ptg_tabladeviaje_enc2_SearchObj.save();
             */
        }

        /**
         * Se formatea la hora de inicio del servicio. 
         * Adicional a esto, se necesita restar 5 horas para que quede en la hora local.
         */
        const setCustomDate = (dateTime, format) => {
            try {
                let myTime = moment(dateTime).subtract(5, 'hours').format(format);
                // log.debug('myTime', myTime);
                return myTime;
            } catch (error) {
                log.debug('Error al setear la hora', error);                
            }
        }

        /**
         * Busca el registro de PTG - Equipo en netsuite
         */
        const getEquipoSgc = (equipo) => {
            try {
                let rows = [];
                var customrecord_ptg_equiposSearchObj = search.create({
                    type: "customrecord_ptg_equipos",
                    filters:
                    [
                        ["custrecord_ptg_autotanquesgc_","startswith",equipo]
                    ],
                    columns:
                    [
                        search.createColumn({
                            name: "name",
                            sort: search.Sort.ASC,
                            label: "Nombre"
                        }),
                        search.createColumn({name: "scriptid", label: "ID de script"}),
                        search.createColumn({name: "internalid", label: "ID interno"}),
                        search.createColumn({name: "custrecord_ptg_ubicacion_", label: "PTG- Planta"}),
                        search.createColumn({name: "custrecord_ptg_subsidiaria_1", label: "PTG- SUBSIDIARIA"})
                    ]
                });
                var searchResultCount = customrecord_ptg_equiposSearchObj.runPaged().count;
                // log.debug("customrecord_ptg_equiposSearchObj result count",searchResultCount);
                customrecord_ptg_equiposSearchObj.run().each(function(result) {
                    let values = result.getAllValues();
                    let obj    = {};
                    // log.debug('values busqueda PTG - equipo', values);

                    obj.id            = Number(values.internalid[0].value);
                    obj.plantaId      = Number(values.custrecord_ptg_ubicacion_[0].value);
                    obj.planta        = values.custrecord_ptg_ubicacion_[0].text;
                    obj.subsidiariaId = Number(values.custrecord_ptg_subsidiaria_1[0].value);
                    obj.subsidiaria   = values.custrecord_ptg_subsidiaria_1[0].text;
                    
                    // log.debug('Values', values);
                    rows.push(obj);
                    return true;
                });
                return rows;
            } catch (error) {
                log.debug('Error al buscar el registro PTG - Equipo', error);                
            }
        }

        return {getInputData, map, reduce, summarize}

    });
