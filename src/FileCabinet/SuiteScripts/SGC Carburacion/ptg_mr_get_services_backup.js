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
         let lastFolio = getLastFolio();
         log.debug('last folio', lastFolio);
         let arrayServices = [];
         try {
             let idToken = login();
             let internalFileId = searchXmlFile();
             let dataToSend = setData(lastFolio);

             // Se busca la información de la dirección por defecto
             let xmlContent = file.load({ id: internalFileId }).getContents();
             let typeModule = "Servicios";
             let action = "obtenerListaPorFolio";

             let responseInfo = getServices(xmlContent, idToken, typeModule, action, dataToSend);
             
             // Esta lógica cambiaría, ya que se responseInfo traerá la respuesta de SGC y no directamente el arreglo de servicios
             arrayServices = responseInfo;
             numServices = responseInfo.length;
             // log.debug('response info', responseInfo);
             log.debug('num services', numServices);

         } catch (error) {
             log.debug('Algo salió mal en el método get input data', error);
         }
         return arrayServices;
         // return [1];
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
         log.debug('MC', 'Entró al mapcontext');
         log.debug('key', mapContext.key);
         // myCounter += 2;
         
         try {
             let values = JSON.parse(mapContext.value);
             log.debug('map', values);

             let newOpp = record.create({
                 type: record.Type.OPPORTUNITY,
                 // defaultValues: {
                 //     script: 205       // Internal id of existing script record
                 // }
             });

             // Información primaria
             let producto = values.producto == 'GLP' ? 'GLP' : null;
             
             // Si no es producto de gas lp, no se registra el servicio
             if (! producto ) {
                 return;
             }
             
             let currency        = 1;
             let tipo_servicio   = 3;// Carburación
             let entity_status   = 13;
             let customform      = 307;
             let productgasLpId  = 4088;
             let publico_general = 14508;
             newOpp.setValue({fieldId:'custbody_ptg_tipo_servicio', value: tipo_servicio});
             // newOpp.setValue({fieldId:'custbody_ptg_estacion_carburacion', value: 1085});
             
             // Campos en clasificación
             newOpp.setValue({fieldId:'custbody_ptg_bomba_despachadora', value: 1});// Valor seteado de manera estática de forma temporal
             newOpp.setText({fieldId:'custbody_ptg_opcion_pago_obj', text: setMetodoPago(values.tipo_pago == 'Contado' ? 1 : 2, values.importe_total ?? 0)});
 
             // newOpp.setValue({fieldId:'customform', value: 124});
             newOpp.setValue({fieldId:'customform', value: customform});
             newOpp.setValue({fieldId:'entity', value: publico_general});
             newOpp.setValue({fieldId:'entitystatus', value: entity_status});
             newOpp.setValue({fieldId:'currency', value: currency});

             // Estación de carburación
             newOpp.setValue({fieldId:'custbody_ptg_estacion_carburacion', value: 1145});

             // Campos sgc carburación
             newOpp.setText({fieldId:'custbody_ptg_vendedor_', text: values.vendedor });
             newOpp.setValue({fieldId:'custbody_ptg_tota_inicial_', value: parseFloat(values.totalizador_inicial ?? 0).toFixed(4)});
             newOpp.setValue({fieldId:'custbody_ptg_totalizador_final_', value: parseFloat(values.totalizador_final ?? 0).toFixed(4) });
             newOpp.setValue({fieldId:'custbody_ptg_tipopago_carburacion_', value: values.tipo_pago == 'Contado' ? 1 : 2});
             newOpp.setValue({fieldId:'custbody_ptg_estacion_', value: 2});
             newOpp.setValue({fieldId:'custbody_ptg_idcliente_', value: publico_general});// Id cliente
             // newOpp.setValue({fieldId:'custbody_ptg_idconsumidor_', value: values.consumidor ? values.cliente.identificador_externo : 14508});
             newOpp.setValue({fieldId:'custbody_ptg_folio_carburacion_', value: values.folio});
             
             newOpp.setText({fieldId:'custbody_ptg_dispensador_', text: values.dispensador });
             newOpp.setValue({fieldId:'custbody_ptg_equipo_', value: 645});
             // newOpp.setValue({fieldId:'custbody_ptg_id_equipo', value: 645});
             newOpp.setText({fieldId:'custbody_ptg_servicio_id', text: values.servicio_id });
             newOpp.setText({fieldId:'custbody_ptg_folio_ticket', text: values.folio_ticket });
             newOpp.setText({fieldId:'custbodyptg_inicio_servicio', text: values.inicio_servicio });
             newOpp.setText({fieldId:'custbodyptg_fin_servicio', text: values.fin_servicio });
             
             newOpp.setText({fieldId:'custbody_ptg_merma', text: values.merma });
             newOpp.setText({fieldId:'custbody_ptg_vale_electronico', text: values.vale_electronico });
             newOpp.setText({fieldId:'custbody_ptg_odometro', text: values.odometro });
             newOpp.setText({fieldId:'custbody_ptg_tipo_registro', text: values.tipo_registro });
             newOpp.setText({fieldId:'custbody_ptg_numero_impresiones', text: values.numero_impresiones });
             newOpp.setText({fieldId:'custbody_ptg_turno', text: values.turno });
             newOpp.setText({fieldId:'custbody_ptg_autoconsumo', text: values.autoconsumo });
             
             // Se agrega el producto de Gas LP a nivel artículo
             newOpp.setSublistValue({
                 sublistId: 'item',
                 fieldId: 'item',
                 line: 0,
                 value: productgasLpId
                 // value: values.producto?.identificador_externo
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
 
             let oppId = newOpp.save();

             log.debug('Info', 'Opotunidad guardada exitósamente: '+oppId);

             
             // Se actualiza el folio recién guardado
             let contadorFolio = record.load({isDynamic : true, type: 'customrecord_ptg_folio_counter', id : 1});
             
             contadorFolio.setValue({fieldId: 'custrecord_ptg_folio_counter', value: values.folio});
             
             let folioId = contadorFolio.save();
             
             log.debug('Folio ID', folioId);

             // mapContext.write({key: 1, value: values.folio});
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
     const searchXmlFile = () => {
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
     const setData = (lastFolio) => {
         return;
     }

     // Obtiene los servicios a generar en Netsuite
     const getServices = (xmlContent, idToken, typeModule, action, dataToSend) => {
         let xml = '<SOAP-ENV:Envelope SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:tns="http://www.sgcweb.com/sgcweb">'+
                     '<SOAP-ENV:Body><ns1:obtenerCarburacionesResponse xmlns:ns1="http://www.sgcweb.com/sgcweb">'+
                         '<return xsi:type="SOAP-ENC:Array" SOAP-ENC:arrayType="tns:servicio_carburacion[1]">'+
                             '<item xsi:type="tns:servicio_carburacion">'+
                                 '<servicio_id xsi:type="xsd:string">E95CC43A-ED23-7B8D-B14D-62C77C680270</servicio_id>'+
                                 '<folio xsi:type="xsd:int">18168</folio>'+
                                 '<folio_ticket xsi:type="xsd:int">14606</folio_ticket>'+
                                 '<inicio_servicio xsi:type="xsd:dateTime">2022-07-08T05:36:00</inicio_servicio>'+
                                 '<fin_servicio xsi:type="xsd:dateTime">2022-07-08T05:36:31</fin_servicio>'+
                                 '<unidad_medida xsi:type="xsd:string">Litro</unidad_medida>'+
                                 '<cantidad xsi:type="xsd:float">4.0000</cantidad>'+
                                 '<merma xsi:type="xsd:int">0</merma>'+
                                 '<producto xsi:type="xsd:string">GLP</producto>'+
                                 '<dispensador xsi:type="xsd:int">1</dispensador>'+
                                 '<cliente xsi:type="xsd:string">Publico en general</cliente>'+
                                 '<identificador xsi:type="xsd:string">Publico en general</identificador>'+
                                 '<consumidor xsi:type="xsd:string">Publico en general VPG</consumidor>'+
                                 '<vale_electronico xsi:type="xsd:string"/>'+
                                 '<vendedor xsi:type="xsd:string">Despachador Usuario</vendedor>'+
                                 '<odometro xsi:type="xsd:float">0.0000</odometro>'+
                                 '<valor_unitario xsi:type="xsd:float">12.1810</valor_unitario>'+
                                 '<subtotal xsi:type="xsd:float">48.7242</subtotal>'+
                                 '<impuesto xsi:type="xsd:string">IVA</impuesto>'+
                                 '<tasa_impuesto xsi:type="xsd:float">16.0000</tasa_impuesto>'+
                                 '<importe_impuesto xsi:type="xsd:float">7.7958</importe_impuesto>'+
                                 '<impuesto_extra xsi:type="xsd:string">IEPS</impuesto_extra>'+
                                 '<tasa_impuesto_extra xsi:type="xsd:float">0.0000</tasa_impuesto_extra>'+
                                 '<importe_impuesto_extra xsi:type="xsd:float">0.0000</importe_impuesto_extra>'+
                                 '<precio_unitario_neto xsi:type="xsd:float">14.1300</precio_unitario_neto>'+
                                 '<importe_total xsi:type="xsd:float">56.5200</importe_total>'+
                                 '<tipo_registro xsi:type="xsd:string">Venta</tipo_registro>'+
                                 '<numero_impresiones xsi:type="xsd:int">2</numero_impresiones>'+
                                 '<folio_dispensador xsi:type="xsd:int">268</folio_dispensador>'+
                                 '<totalizador_inicial xsi:type="xsd:float">36571.0000</totalizador_inicial>'+
                                 '<totalizador_final xsi:type="xsd:float">36575.0000</totalizador_final>'+
                                 '<tipo_pago xsi:type="xsd:string">Contado</tipo_pago>'+
                                 '<turno xsi:type="xsd:string">Jefe automático - 12 febrero 07:03</turno>'+
                                 '<estacion xsi:type="xsd:string">CAR00650</estacion>'+
                                 '<cliente_id xsi:type="xsd:string">1</cliente_id>'+
                                 '<consumidor_id xsi:type="xsd:string">1</consumidor_id>'+
                                 '<autoconsumo xsi:type="xsd:int">0</autoconsumo>'+
                                 '<identificador_externo_cliente xsi:type="xsd:string"/>'+
                                 '<identificador_externo_consumidor xsi:type="xsd:string"/>'+
                             '</item>'+
                         '</return></ns1:obtenerCarburacionesResponse>'+
                     '</SOAP-ENV:Body>'+
                 '</SOAP-ENV:Envelope>';

         // var parser = new DOMParser();
         // var xmlDoc = parser.parseFromString(xml, "text/xml"); //important to use "text/xml"
         // let items  = xmlDoc.getElementsByTagName("item");
         // let result = [];

         // for(let i = 0; i < items.length; i++) {
         //     let obj = {};
         //     // add longitude value to "result" array
         //     var tag = items[i].getElementsByTagName('servicio_id');
         //     var folio = items[i].getElementsByTagName('folio');
         //     obj.servicio_id = tag[0].innerHTML;
         //     obj.folio = folio[0].innerHTML;
         //     console.log(tag[0].innerHTML);
         //     //result.push(items [i].childNodes[0].nodeValue);
         // }

         let services = [
             {
                 servicio_id : "2755965B-7697-3463-9CE2-62D7E3D78EC6",
                 folio : 18772,
                 folio_ticket : 15818,
                 inicio_servicio : '2022-07-20T16:14:00',
                 fin_servicio : '2022-07-20T16:14:32',
                 unidad_medida : 'Litro',
                 cantidad : 12.18,
                 merma : 0,
                 producto : 'GLP',
                 dispensador : 1,
                 cliente : 'Publico en general',
                 identificador : 'Publico en general',
                 consumidor : 'Publico en general',
                 vale_electronico : '',
                 vendedor : 'Despachador Usuario',
                 odometro : 0.0000,
                 valor_unitario : 12.1982,
                 subtotal : 148.5740,
                 impuesto : 'IVA',
                 tasa_impuesto : 16.0000,
                 importe_impuesto : 23.7718,
                 impuesto_extra : 'IEPS',
                 tasa_impuesto_extra : 0.0000,
                 importe_impuesto_extra : 0.0000,
                 precio_unitario_neto : 14.1500,
                 importe_total : 172.3458,
                 tipo_registro : 'Venta',
                 numero_impresiones : 2,
                 folio_dispensador : 672,
                 totalizador_inicial : 76547.0528,
                 totalizador_final : 76559.2328,
                 tipo_pago : 'Contado',
                 turno : 'Jefe automático - 12 febrero 07:03',
                 estacion : 'CAR00650',
                 cliente_id : 1,
                 consumidor_id : 1,
                 autoconsumo : 0,
                 identificador_externo_cliente : '',
                 identificador_externo_consumidor : ''
             }
         ];

         return services;
     }

     // Obtiene el último folio guardado en Netsuite
     const getLastFolio = () => {
         let lastFolio = search.lookupFields({
             type: 'customrecord_ptg_folio_counter',
             id: 1,
             columns: ['internalid', 'custrecord_ptg_folio_counter']
         });

         return lastFolio.custrecord_ptg_folio_counter;
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

     // Obtiene todos los folios por ubicaciones
     const getFolios = () => {
         let foliosArray = [];
         var customrecord_ptg_folio_counterSearchObj = search.create({
             type: "customrecord_ptg_folio_counter",
             filters:
             [
             ],
             columns:
             [
                 search.createColumn({
                     name: "scriptid",
                     sort: search.Sort.ASC,
                     label: "ID de script"
                 }),
                 search.createColumn({name: "custrecord_ptg_folio_counter", label: "Contador"}),
                 search.createColumn({name: "custrecord_ptg_planta", label: "Ubicación"}),
                 search.createColumn({name: "custrecord_ptg_ip_sgc_carb", label: "PTG IP SGC"})
             ]
         });
         var searchResultCount = customrecord_ptg_folio_counterSearchObj.runPaged().count;
         log.debug("customrecord_ptg_folio_counterSearchObj result count",searchResultCount);
         customrecord_ptg_folio_counterSearchObj.run().each(function(result){
             // .run().each has a limit of 4,000 results
             return true;
         });
          
          /*
          customrecord_ptg_folio_counterSearchObj.id="customsearch1658353869896";
          customrecord_ptg_folio_counterSearchObj.title="PTG|Obtener Folios (copy)";
          var newSearchId = customrecord_ptg_folio_counterSearchObj.save();
          */
     }

     return {getInputData, map, reduce, summarize}

 });
