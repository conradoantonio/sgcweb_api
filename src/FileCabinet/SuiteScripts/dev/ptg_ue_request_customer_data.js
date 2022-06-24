/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
 define(['N/file', 'N/http', 'N/search', 'N/xml', 'N/record', 'N/query'],
 /**
* @param{file} file
* @param{http} http
* @param{search} search
* @param{xml} xml
*/
 (file, http, search, xml, record, query) => {
     /**
      * Defines the function definition that is executed before record is loaded.
      * @param {Object} scriptContext
      * @param {Record} scriptContext.newRecord - New record
      * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
      * @param {Form} scriptContext.form - Current form
      * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
      * @since 2015.2
      */
     const beforeLoad = (scriptContext) => {

     }

     /**
      * Defines the function definition that is executed before record is submitted.
      * @param {Object} scriptContext
      * @param {Record} scriptContext.newRecord - New record
      * @param {Record} scriptContext.oldRecord - Old record
      * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
      * @since 2015.2
      */
     const beforeSubmit = (scriptContext) => {

     }

     /**
      * Defines the function definition that is executed after record is submitted.
      * @param {Object} scriptContext
      * @param {Record} scriptContext.newRecord - New record
      * @param {Record} scriptContext.oldRecord - Old record
      * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
      * @since 2015.2
      */
     const afterSubmit = (scriptContext) => {
         try {
             log.debug('Info', 'Script para actualizar cliente');
             let idToken = login();

             if( scriptContext.type === scriptContext.UserEventType.CREATE ) {
                 let rowCustomer = scriptContext.newRecord;// Get edited customer
                 // Obtiene un objeto con campos de cabecera
                 let customerInfo = search.lookupFields({
                     type: search.Type.CUSTOMER,
                     id: rowCustomer.id,
                     columns: ['companyname']
                 });
                 let internalFileId = searchXmlFile(search);
                 let dirDefault = searchDefaultAddress(search, rowCustomer);
                 let dataToSend = setDataCustomer(rowCustomer, customerInfo, dirDefault, 'create');
                 
                 log.debug('Info', 'Edición de cliente');
                 log.debug('Customer aditional info', customerInfo);
                 log.debug('Xml ID', internalFileId);
                 log.debug('formato de direccion', dirDefault);
                 log.debug('data customer', dataToSend);

                 // Se busca la información de la dirección por defecto
                 let xmlContent = file.load({ id: internalFileId }).getContents();
                 let typeModule = "Clientes";
                 let action = "registrar";

                 let responseInfo = registerCustomer(xmlContent, idToken, typeModule, action, dataToSend);

                 log.debug('response info', responseInfo);

                 // Se validará que haya salido bien el response
                 if (["1111", "0000"].includes(responseInfo.code[0].textContent) ) {
                     log.debug('Response code info', 'Todo salió bien');
                     let realResult = JSON.parse(responseInfo.info[0].textContent);
                     log.debug('respuesta sgcweb', realResult);
                     log.debug('numero de cliente de sgcweb', realResult.numero_cliente);

                     // Se edita el campo custentity_ptg_extermal_id para empatarlo con SGC Web
                     record.submitFields({
                         type: record.Type.CUSTOMER,
                         id: rowCustomer.id,
                         values: {
                             'custentity_ptg_codigodecliente_': realResult.numero_cliente
                         }
                     });

                     log.debug('Actualización', 'Código de cliente actualizado');
                 } else {
                     log.debug('Ocurrió un error', responseInfo.code[0].textContent);
                 }
                 //////////////////////////////////////////////////////////////////////////////
             }
             else if ( scriptContext.type === scriptContext.UserEventType.EDIT ) {
                 let rowCustomer = scriptContext.newRecord;// Get edited customer
                 let internalFileId = searchXmlFile(search);
                 let dirDefault = searchDefaultAddress(search, rowCustomer);
                 let isConsumer = rowCustomer.getValue({fieldId:'parent'});

                 log.debug('Info', 'Edición de cliente');
                 log.debug('parent', rowCustomer.getValue({fieldId:'parent'}));
                 log.debug('Politica de venta', rowCustomer.getValue({fieldId:'custentity_ptg_politicadeventa_'}));
                 log.debug('Politica de consumo', rowCustomer.getValue({fieldId:'custentity_ptg_politicadeconsumo_cliente'}));
                 
                 log.debug('Xml ID', internalFileId);
                 log.debug('formato de direccion', dirDefault);
                 // log.debug('data customer', dataToSend);

                 let typeModule = action = dataToSend = responseInfo = '';
                 let xmlContent = file.load({ id: internalFileId }).getContents();
                 
                 if ( isConsumer ) { // Se da de alta un consumidor
                     
                     typeModule = "Consumidores";
                     action = "registrar";
                     dataToSend = setDataConsumer(rowCustomer, null, dirDefault, 'edit');
                     responseInfo = registerCustomer(xmlContent, idToken, typeModule, action, dataToSend);
                     log.debug('Info', 'Entró a registrar un consumidor');
                 
                 } else { // Se da de alta un cliente
                 
                     typeModule = "Clientes";
                     action = "registrar";
                     dataToSend = setDataCustomer(rowCustomer, null, dirDefault, 'edit');
                     responseInfo = registerCustomer(xmlContent, idToken, typeModule, action, dataToSend);
                     log.debug('Info', 'Entró a registrar un cliente');
                 
                 }

                 log.debug('response info', responseInfo);

                 // Se validará que haya salido bien el response
                 if (["1111", "0000"].includes(responseInfo.code[0].textContent) ) {
                     log.debug('Response code info', 'Todo salió bien');
                     if ( isConsumer ) { // Se registró un consumidor
                         log.debug('respuesta', 'Consumidor registrado');
                     } else { // Se registró un cliente
                         let realResult = JSON.parse(responseInfo.info[0].textContent);
                         log.debug('respuesta sgcweb', realResult);
                         log.debug('numero de cliente de sgcweb', realResult.numero_cliente);

                         // Se edita el campo custentity_ptg_extermal_id para empatarlo con SGC Web
                         record.submitFields({
                             type: record.Type.CUSTOMER,
                             id: rowCustomer.id,
                             values: {
                                 'custentity_ptg_codigodecliente_': realResult.numero_cliente
                             }
                         });
                         log.debug('Actualización', 'Código de cliente actualizado');
                     }
                 } else {
                     log.debug('Ocurrió un error', responseInfo.code[0].textContent);
                 }
             }

         } catch (error) {
             log.debug('Algo salió mal', error);
         }
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

     // Configura los datos a enviar del cliente a SGC web
     const setDataCustomer = (rowCustomer, aditionalCustomerInfo = false, dirDefault, type) => {
         // log.debug('info', 'entró a la función de configurar la información del cliente');

         let nombre    = ( type == 'edit' ? rowCustomer.getText({fieldId:'companyname'}) : aditionalCustomerInfo?.companyname );
         let rfc       = ( type == 'edit' ? rowCustomer.getText({fieldId:'custentity_mx_rfc'}) : rowCustomer.getValue({fieldId:'custentity_mx_rfc'}) );
         let telefono1 = ( type == 'edit' ? rowCustomer.getText({fieldId:'phone'}) : rowCustomer.getValue({fieldId:'phone'}) );
         let telefono2 = ( type == 'edit' ? rowCustomer.getText({fieldId:'altphone'}) : rowCustomer.getValue({fieldId:'altphone'}) );
         let email     = ( type == 'edit' ? rowCustomer.getText({fieldId:'email'}) : rowCustomer.getValue({fieldId:'email'}) );
         let politica  = ( type == 'edit' ? rowCustomer.getValue({fieldId:'custentity_ptg_politicadeventa_'}) : rowCustomer.getValue({fieldId:'custentity_ptg_politicadeventa_'}) );

         let data = {
             "numero_cliente":"",
             "identificador_externo": rowCustomer.id,
             "nombre":nombre ? nombre : "Nombre cliente",
             "rfc":rfc ?? "",
             "calle":dirDefault['calle'] ?? "",
             "no_exterior":dirDefault['no_exterior'] ?? "",
             "no_interior":dirDefault['no_interior'] ?? "",
             "colonia":dirDefault['colonia'] ?? "",
             "localidad":dirDefault['localidad'] ?? "",
             "referencia":dirDefault['referencia'] ?? "",
             "ciudad":dirDefault['ciudad'] ?? "",
             "estado":dirDefault['estado'] ?? "",
             "codigo_postal":( dirDefault['codigo_postal'] && dirDefault['codigo_postal'] != '' ? dirDefault['codigo_postal'] : "31135" ),
             "pais":dirDefault['pais'] ?? "",
             "telefono1":telefono1 ? telefono1 : "industrial",
             "telefono2":telefono2 ?? "",
             "activo":"1",
             "email":email ?? "",
             "saldo":"",
             "politica_venta_id":politica ?? ""
         };

         return data;
     }

     // Configura los datos a enviar del consumidor a SGC web
     const setDataConsumer = (rowCustomer, aditionalConsumerInfo = false, dirDefault, type) => {
         // log.debug('info', 'entró a la función de configurar la información del cliente');

         let nombre     = ( type == 'edit' ? rowCustomer.getText({fieldId:'altname'}) : aditionalConsumerInfo?.companyname );
         let telefono1  = ( type == 'edit' ? rowCustomer.getText({fieldId:'phone'}) : rowCustomer.getValue({fieldId:'phone'}) );
         let telefono2  = ( type == 'edit' ? rowCustomer.getText({fieldId:'altphone'}) : rowCustomer.getValue({fieldId:'altphone'}) );
         let email      = ( type == 'edit' ? rowCustomer.getText({fieldId:'email'}) : rowCustomer.getValue({fieldId:'email'}) );
         let cliente_id = ( type == 'edit' ? rowCustomer.getValue({fieldId:'parent'}) : rowCustomer.getValue({fieldId:'parent'}) );
         let politica   = ( type == 'edit' ? rowCustomer.getValue({fieldId:'custentity_ptg_politicadeconsumo_cliente'}) : rowCustomer.getValue({fieldId:'custentity_ptg_politicadeconsumo_cliente'}) );

         let data = {
             "numero_consumidor":"",
             "identificador_externo": rowCustomer.id,
             "nombres":nombre ? nombre : "Nombre cliente",
             "apellidos":"Doe",
             "telefono1":telefono1 ? telefono1 : "industrial",
             "telefono2":telefono2 ?? "",
             "descripcion":"Descripción de subcliente",
             "comentario":"Comentario de subcliente",
             "calle_numero":dirDefault['no_exterior'] ?? "",
             "colonia":dirDefault['colonia'] ?? "",
             "ciudad":dirDefault['ciudad'] ?? "",
             "estado":dirDefault['estado'] ?? "",
             "pais":dirDefault['pais'] ?? "",
             "codigo_postal":( dirDefault['codigo_postal'] && dirDefault['codigo_postal'] != '' ? dirDefault['codigo_postal'] : "31135" ),
             "email":email ?? "",
             "saldo":"",
             "tipo_consumidor_id":"",
             "politica_consumo_id":politica ?? "",
             "cliente_id":cliente_id,
             "capacidad":"2",
             "tipo_pago":"",
             "numero_verificador":""
         };

         log.debug('info consumidor', data);

         return data;
     }

     // Busca la dirección por defecto del cliente
     const searchDefaultAddress = (search, rowCustomer) => {
         // log.debug('info', 'entró a la función de buscar la dirección por defecto');
         // Búsqueda personalizada para la dirección por defecto del cliente
         var customerSearchObj = search.create({
             type: "customer",
             filters:
             [
                ["internalid","anyof",rowCustomer.id],
                "AND", 
                ["isdefaultshipping","is","T"]
             ],
             columns:
             [
                search.createColumn({
                   name: "custrecord_ptg_estado",
                   join: "Address",
                   label: "PTG - ESTADO"
                }),
                search.createColumn({
                   name: "custrecord_ptg_colonia_ruta",
                   join: "Address",
                   label: "PTG - COLONIA Y RUTA"
                }),
                search.createColumn({
                   name: "custrecord_ptg_exterior_number",
                   join: "Address",
                   label: "Exterior Number"
                }),
                search.createColumn({
                   name: "custrecord_ptg_interior_number",
                   join: "Address",
                   label: "Interior Number"
                }),
                search.createColumn({
                   name: "isdefaultshipping",
                   join: "Address",
                   label: "Dirección de envío predeterminada"
                }),
                search.createColumn({
                   name: "custrecord_ptg_address_reference",
                   join: "Address",
                   label: "Address Reference"
                }),
                search.createColumn({
                   name: "custrecord_ptg_street",
                   join: "Address",
                   label: "Street"
                }),
                search.createColumn({
                  name: "custrecord_ptg_codigo_postal",
                  join: "Address",
                  label: "PTG - CODIGO POSTAL"
                }),
                search.createColumn({
                   name: "custrecord_ptg_town_city",
                   join: "Address",
                   label: "Town/City"
                }),
                search.createColumn({name: "country", label: "País"})
             ]
         });
         
         let dirDefault = {};
         var searchResultCount = customerSearchObj.runPaged().count;
         // log.debug("customerSearchObj result count",searchResultCount);
         customerSearchObj.run().each(function(result){
             let resDireccion = result.getAllValues();
             let isDefault = resDireccion['Address.isdefaultshipping'];

             if ( isDefault == true ) {
                 dirDefault['no_exterior']   = resDireccion['Address.custrecord_ptg_exterior_number'];
                 dirDefault['no_interior']   = resDireccion['Address.custrecord_ptg_interior_number'];
                 dirDefault['estado']        = resDireccion['Address.custrecord_ptg_estado'];
                 dirDefault['calle']         = resDireccion['Address.custrecord_ptg_street'];
                 dirDefault['colonia']       = resDireccion['Address.custrecord_ptg_colonia_ruta'][0]?.text;
                 dirDefault['localidad']     = resDireccion['Address.custrecord_ptg_town_city'];
                 dirDefault['referencia']    = resDireccion['Address.custrecord_ptg_address_reference'];
                 dirDefault['ciudad']        = resDireccion['Address.custrecord_ptg_town_city'];
                 dirDefault['codigo_postal'] = resDireccion['Address.custrecord_ptg_codigo_postal'];
                 dirDefault['pais']          = resDireccion.country[0].text;
             }

             // log.debug('pais', resDireccion.country[0].text)
             // log.debug('res direccion', resDireccion);
             // log.debug('Estado', resDireccion['Address.custrecord_ptg_estado']);

             // dirPre = result.getValue({ name: "internalid", label: "Internal ID" });
             // log.debug('direccion',result.getValue({ name: "internalid", label: "Internal ID" }));
             // log.debug('direccion_ptg_estado value', result.getValue({name: "custrecord_ptg_estado", label: "PTG - ESTADO"}));
             // log.debug('direccion_ptg_estado text', result.getText({name: "custrecord_ptg_estado", label: "PTG - ESTADO"}));
             // .run().each has a limit of 4,000 results
             return true;
         });

         return dirDefault;
     }

     // Guarda / actualiza un cliente en SGC web
     const registerCustomer = (xmlContent, idToken, typeModule, action, data) => {
         xmlContent = xmlContent.split('idSession').join(`${idToken}`);
         xmlContent = xmlContent.split('typeModule').join(`${typeModule}`);
         xmlContent = xmlContent.split('action').join(`${action}`);
         xmlContent = xmlContent.split('data').join(`${JSON.stringify(data)}`);

         // log.debug('despues del primer join', xmlContent);

         let headers = {};
         headers['Content-Type'] = 'text/xml; charset=utf-8';
         headers['SOAPAction'] = 'http://testpotogas.sgcweb.com.mx/ws/1094AEV2/v2/soap.php/procesarPeticion';
         let url = 'http://testpotogas.sgcweb.com.mx//ws/1094AEV2/v2/soap.php';
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

     return {beforeLoad, beforeSubmit, afterSubmit}

 });
