/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/file', 'N/http', 'N/https', 'N/record', 'N/search', 'N/xml'],
    /**
 * @param{file} file
 * @param{http} http
 * @param{https} https
 * @param{record} record
 * @param{search} search
 * @param{xml} xml
 */
    (file, http, https, record, search, xml) => {
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
            let oportunidades = getOpportunities();

            // log.debug('busqueda', oportunidades);

            return oportunidades;
            // Cargar los pedidos de hoy
            // return ['a', 'b', 'c'];
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
                let idToken = login();
                let internalFileId = searchXmlFile(search);
                let xmlContent = file.load({ id: internalFileId }).getContents();
                let dataToSend = setData(rowItem, null, 'create');
                let typeModule = "Pedidos";
                let action = "registrar";
                let responseInfo = registerOpp(xmlContent, idToken, typeModule, action, dataToSend);

                // log.debug('Map context', JSON.parse(mapContext.value));
                let oppValues = JSON.parse(mapContext.value);

                log.debug('Opp Values', oppValues.values.internalid.value);
                // log.debug('Internal ID', oppValues.internalid);

                let response = [
                    {
                        "folio":"4",
                        "fecha_inicio":"2015-01-22 18:22:12",
                        "importe_total":"28.8900",
                        "producto":{
                            "nombre":"CILINDRO DE GAS LP CAP. 10 KGS",
                            "identificador_externo":"5568"
                        },
                        "cliente":{
                            "nombres":"Publico en general",
                            "rfc":"XAXX010101000"
                        },
                        "unidad_medida":"0"
                    }
                ];


                let example = {
                    "busqueda":{ 
                        "folioPosicion":"17852", 
                        "cantidadElementos":"1" 
                    },
                    "atributosVenta":{
                        "folio":1,
                        "importe_total":1, 
                        "fecha_inicio": "1",
                        "fecha_fin": "1",
                        "unidad_medida": "1","cantidad": "1",
                        "estado": "1","folio_unidad": "1",
                        "totalizador_inicial": "1","totalizador_final": "1",
                        "tipo_pago": "1","subtotal": "1",
                        "tasa_impuesto": "1","precio_unitario_neto": "1","valor_unitario": "1",
                        "importe_total": "1","importe_impuesto": "1",
                        "vendedor":{
                            "identificador_externo": "1",
                            "nombre":"1"
                        },
                        "pedido":{
                            "identificador_externo": "1",
                            "fecha_atencion":"1",
                            "fecha_servicio":"1",
                            "estatus":"1",
                            "folio":"1"
                        },
                        "posicion_gps":{
                            "latitud_indicador":"1",
                            "latitud_grados_decimales":"1",
                            "longitud_indicador":"1",
                            "longitud_grados_decimales":"1"
                        },
                        "producto":{
                            "identificador_externo":"1"
                        },
                        "unidad":{
                            "identificador_externo":"1"
                        },
                        "cliente":{
                            "identificador_externo":"1"
                        },
                        "consumidor":{
                            "identificador_externo":"1"
                        }
                    }
                }

                let oppRecord = record.load({id : oppValues.values.internalid.value, type: record.Type.OPPORTUNITY});

                oppRecord.setValue({
                    fieldId:'custbody_ptg_folio_sgc_',              value:response.folio,
                    fieldId:'custbody_ptg_fechainicio_sgc',         value:response.fecha_inicio,
                    fieldId:'custbody_fecha_final_sgc_',            value:response.fecha_final,
                    fieldId:'custbody_ptg_status_sgc_',             value:response.fecha,
                    fieldId:'custbody_ptg_tipodeservicio_',         value:response.fecha,
                    fieldId:'custbody_ptg_foliounidad_sgc',         value:response.fecha,
                    fieldId:'custbody_ptg_totalizador_inicial_sgc', value:response.fecha,
                    fieldId:'custbody_totalizador_final_sgc_',      value:response.importe_total,
                    fieldId:'custbody_ptg_tipo_de_pago_sgc_',       value:response.fecha,
                });
                
                oppRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: 0,
                    // value: 10
                    value: response.importe
                });

                oppRecord.save();
                log.debug('Info', 'Registro actualizado exitósamente');
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
            headers['SOAPAction'] = 'http://testpotogas.sgcweb.com.mx/ws/1094AEV2/v2/soap.php/login';
            let url = 'http://testpotogas.sgcweb.com.mx//ws/1094AEV2/v2/soap.php';
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

        // Obtiene el listado de oportunidades a actualizar por sgcweb
        const getOpportunities = () => {
            var opportunitySearchObj = search.create({
                type: "opportunity",
                filters:
                [
                    ["entitystatus","anyof","11","10","20","19"], 
                        "AND", 
                    ["expectedclosedate","within","today"]
                ],
                columns:
                [
                    search.createColumn({
                        name: "trandate",
                        sort: search.Sort.ASC,
                        label: "Fecha"
                    }),
                    search.createColumn({name: "tranid", label: "Número de documento"}),
                    search.createColumn({name: "entity", label: "Cliente"}),
                    search.createColumn({name: "memo", label: "Nota"}),
                    search.createColumn({name: "transactionnumber", label: "Número de transacción"}),
                    search.createColumn({name: "title", label: "Título"}),
                    search.createColumn({name: "salesrep", label: "Representante de ventas"}),
                    search.createColumn({name: "entitystatus", label: "Estado de oportunidad"}),
                    search.createColumn({name: "projectedtotal", label: "Total previsto"}),
                    search.createColumn({name: "rangelow", label: "Intervalo: bajo"}),
                    search.createColumn({name: "rangehigh", label: "Intervalo: alto"}),
                    search.createColumn({name: "custbody_otg_folio_aut", label: "Folio Aut."}),
                    search.createColumn({name: "internalid", label: "ID interno"})
                ]
            });
            // var searchResultCount = opportunitySearchObj.runPaged().count;
            // log.debug("opportunitySearchObj result count",searchResultCount);
            // opportunitySearchObj.run().each(function(result){
            //    // .run().each has a limit of 4,000 results
            //    return true;
            // });

            return opportunitySearchObj;
        }

        return {getInputData, map, reduce, summarize}

    });
