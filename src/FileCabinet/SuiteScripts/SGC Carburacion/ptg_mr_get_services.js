/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/file', 'N/format', 'N/http', 'N/https', 'N/record', 'N/search', 'N/xml'],
    /**
 * @param{file} file
 * @param{format} format
 * @param{http} http
 * @param{https} https
 * @param{record} record
 * @param{search} search
 * @param{xml} xml
 */
    (file, format, http, https, record, search, xml) => {
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
            let arrayServices = [];
            try {
                let idToken = login();
                log.debug('Token ID', idToken);
                let internalFileId = searchXmlFile(search);
                let dataToSend = setData();

                // Se busca la información de la dirección por defecto
                let xmlContent = file.load({ id: internalFileId }).getContents();
                let typeModule = "Servicios";
                let action = "registrar";

                let responseInfo = getServices(xmlContent, idToken, typeModule, action, dataToSend);
                
                // Esta lógica cambiaría, ya que se responseInfo traerá la respuesta de SGC y no directamente el arreglo de servicios
                arrayServices = responseInfo;
                log.debug('response info', responseInfo);

            } catch (error) {
                log.debug('Algo salió mal en el método get input data', error);
            }
            return arrayServices;
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
                // log.debug('map', mapContext);
                
                let values = JSON.parse(mapContext.value);
                log.debug('map', values);

                let newOpp = record.create({
                    type: record.Type.OPPORTUNITY,
                    // defaultValues: {
                    //     script: 205       // Internal id of existing script record
                    // }
                });
    
                newOpp.setValue({fieldId:'customform', value: 124});
                newOpp.setValue({fieldId:'entity', value: values.cliente?.identificador_externo});
                newOpp.setValue({fieldId:'entitystatus', value: 13});
                newOpp.setValue({fieldId:'currency', value: 1});

                // Campos sgc carburación
                newOpp.setValue({fieldId:'custbody_ptg_folio_carburacion_', value: values.folio});
                newOpp.setText({fieldId:'custbody_ptg_dispensador_', text: values.folio_unidad});
                newOpp.setText({fieldId:'custbody_ptg_vendedor_', text: values.vendedor?.nombre });
                newOpp.setValue({fieldId:'custbody_ptg_tota_inicial_', value: values.totalizador_inicial ?? 0});
                newOpp.setValue({fieldId:'custbody_ptg_totalizador_final_', value: values.totalizador_final ?? 0 });
                newOpp.setValue({fieldId:'custbody_ptg_tipopago_carburacion_', value: values.tipo_pago ?? 1});
                newOpp.setValue({fieldId:'custbody_ptg_estacion_', value: 2});

                // Se agrega el producto de Gas LP a nivel artículo
                newOpp.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: 0,
                    value: values.producto?.identificador_externo
                });
                newOpp.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: 0,
                    value: values.cantidad ?? 0
                });
                newOpp.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    line: 0,
                    value: values.valor_unitario ?? 0
                });
    
                newOpp.save();

                log.debug('Info', 'Opotunidad guardada exitósamente');
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

        // Login
        const login = () => {
            let resFileId;
            
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
                resFileId = result.getValue({ name: "internalid", label: "Internal ID" });
                return true;
            });

            let xmlContent = file.load({ id: resFileId }).getContents();
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
            // log.debug('info', 'entró a la función de buscar archivo xml para peticiones');
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
            // let searchResultCount = fileSearchObj.runPaged().count;
            // log.debug("fileSearchObj result count", searchResultCount);
            fileSearchObj.run().each(function (result) {
                // .run().each has a limit of 4,000 results
                internalFileId = result.getValue({ name: "internalid", label: "Internal ID" });
                return true;
            });

            return internalFileId;
        }

        // Configura la data
        const setData = () => {
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
                    "unidad_medida": "1",
                    "cantidad": "1",
                    "estado": "1",
                    "folio_unidad": "1",
                    "totalizador_inicial": "1",
                    "totalizador_final": "1",
                    "tipo_pago": "1",
                    "subtotal": "1",
                    "tasa_impuesto": "1",
                    "precio_unitario_neto": "1",
                    "valor_unitario": "1",
                    "importe_total": "1",
                    "importe_impuesto": "1",
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
        }

        // Obtiene los servicios a generar en Netsuite
        const getServices = (xmlContent, idToken, typeModule, action, dataToSend) => {
            let services = [
                {
                    "folio":"17852",
                    "importe_total":"502.0000",
                    "fecha_inicio":"2021-10-08 01:19:48",
                    "fecha_fin":"2021-10-0801:20:22",
                    "unidad_medida":"Litro",
                    "cantidad":"34.0000",
                    "estado":"Terminado",
                    "folio_unidad":"1562",
                    "totalizador_inicial":"128835.0000",
                    "totalizador_final":"128869.0000",
                    "tipo_pago":"1",
                    "subtotal":"432.7600",
                    "tasa_impuesto":"16.0000",
                    "precio_unitario_neto":"14.3500",
                    "valor_unitario":"12.3707",
                    "importe_impuesto":"69.2400",
                    "vendedor":{
                        "identificador_externo":null,
                        "nombre":"Vendedor 2137"
                    },       
                    "pedido":{
                        "identificador_externo":null,
                        "fecha_atencion":null,
                        "fecha_servicio":null,
                        "estatus":null,
                        "folio":null
                    },
                    "posicion_gps":{
                        "latitud_indicador":"N",
                        "latitud_grados_decimales":"2208.3528",
                        "longitud_indicador":"W",
                        "longitud_grados_decimales":"10102.0684"
                    },
                    "producto":{
                        "identificador_externo":1753
                    },
                    "unidad":{
                        "identificador_externo":"2137"
                    },
                    "cliente":{
                        "identificador_externo":"42229"
                    },
                    "consumidor":{
                        "identificador_externo":"42251"
                    }
                }
            ];

            return services;
        }

        return {getInputData, map, reduce, summarize}

    });
