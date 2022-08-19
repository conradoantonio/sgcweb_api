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
                if( scriptContext.type === scriptContext.UserEventType.CREATE || scriptContext.type === scriptContext.UserEventType.CREATE ) {
                    // Se actualiza el campo tipo check
                    var custom = scriptContext.newRecord;// Get edited customer
    
                    record.submitFields({
                        type: record.Type.CUSTOMER,
                        id: custom.id,
                        values: {
                            'custentity_ptg_cliente_act_sgc': "T",
                        }
                    });
                }
                
                let idToken = login();

                if ( scriptContext.type === scriptContext.UserEventType.EDIT || scriptContext.type === scriptContext.UserEventType.CREATE ) {
                    log.debug('Info', 'Edición de cliente');

                    let actionType = scriptContext.type === scriptContext.UserEventType.EDIT ? 'edit' : 'new';
                    let rowCustomer = scriptContext.newRecord;// Get edited customer
                    let internalFileId = searchXmlFile();
                    let customerAddresses = searchCustomerAddresses(rowCustomer.id);
                    let customerInfo = search.lookupFields({
                        type: search.Type.CUSTOMER,
                        id: rowCustomer.id,
                        columns: ['companyname', 'altname', 'phone', 'altphone', 'email', 'balance', 'entityid']
                    });
                    let tipo_pago       = ( actionType == 'edit' ? rowCustomer.getValue({fieldId: 'custentity_ptg_alianza_comercial_cliente'}) : rowCustomer.getValue({fieldId:'custentity_ptg_alianza_comercial_cliente'}) );
                    let idPoliticaVenta = tipo_pago == 2 ? 'CREDITO_DEFAULT' : 'CONTADO';
                    log.debug('customerInfo', customerInfo);
                    // log.debug('entityId', entityId);
                    // return;
                    // let dirDefault = searchDefaultAddress(search, rowCustomer);
                    // let isConsumer = rowCustomer.getValue({fieldId:'parent'});
                    // log.debug('Alianza comercial', rowCustomer.getValue({fieldId: 'custentity_ptg_alianza_comercial_cliente'}));
                    // log.debug('Alianza comercial texto', rowCustomer.getText({fieldId: 'custentity_ptg_alianza_comercial_cliente'}));
                    // log.debug('Límite de crédito', rowCustomer.getValue({fieldId: 'creditlimit'}));
                    // log.debug('Politica de venta', rowCustomer.getValue({fieldId:'custentity_ptg_politicadeventa_'}));
                    // log.debug('Politica de consumo', rowCustomer.getValue({fieldId:'custentity_ptg_politicadeconsumo_cliente'}));
                    
                    // log.debug('Xml ID', internalFileId);
                    // log.debug('Listado de direcciones', customerAddresses);
                    // log.debug('data customer', dataToSend);
                    // return;
                    let typeModule = action = responseConsPol = '';
                    let xmlContent = file.load({ id: internalFileId }).getContents();

                    // Se da de alta la política de venta
                    // typeModule = "PoliticasVenta";
                    // action = "registrar";
                    // dataSalesPolicy = setDataSalesPolicy(rowCustomer, customerInfo, actionType);
                    // responseConsPol = registerSgcData(xmlContent, idToken, typeModule, action, dataSalesPolicy);
                    // log.debug('Info', 'Entró a registrar una política de venta');

                    // if (["1111", "0000"].includes(responseConsPol.code[0].textContent) ) {
                    //     log.debug('SGC', 'Política de venta registrada');
                    //     log.debug('Respuesta sgcweb política de venta', responseConsPol.info);
                    // } else {
                    //     log.debug('Ocurrió un error en políticas de venta', responseConsPol.code[0].textContent);
                    // }
                    // return;
                    // Se da de alta el cliente
                    typeModule = "Clientes";
                    action = "registrar";
                    dataCustomer = setDataCustomer(rowCustomer, customerInfo, idPoliticaVenta, customerAddresses.default, actionType);
                    // dataCustomer = setDataCustomer(rowCustomer, customerInfo, dataSalesPolicy.identificador_externo, customerAddresses.default, actionType);
                    responseCustomer = registerSgcData(xmlContent, idToken, typeModule, action, dataCustomer);
                    log.debug('Info', 'Entró a registrar un cliente');

                    if (["1111", "0000"].includes(responseCustomer.code[0].textContent) ) {
                        log.debug('SGC', 'Cliente registrado correctamente');
                        let realResult = JSON.parse(responseCustomer.info[0].textContent);
                        log.debug('Respuesta sgcweb cliente', realResult);
                        log.debug('Número de cliente de sgcweb', realResult.numero_cliente);

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
                        log.debug('Ocurrió un error en clientes', responseCustomer.code[0].textContent);
                    }
                    // return 'Hola';

                    // Se dan de alta los registros de consumidores y políticas de consumo
                    let allAddress = customerAddresses.addresses;
                    for (let j = 0; j < allAddress.length; j++) {
                        typeModule = "PoliticasConsumo";
                        action = "registrar";
                        dataConsumptionPolicy = setDataConsumptionPolicy(rowCustomer, allAddress[j], actionType);
                        responseConsumptionPolicy = registerSgcData(xmlContent, idToken, typeModule, action, dataConsumptionPolicy);
                        log.debug('Info', 'Entró a registrar una política de consumo');

                        // Se validará que haya salido bien el response
                        if (["1111", "0000"].includes(responseConsumptionPolicy.code[0].textContent) ) {
                            log.debug('SGC', 'Política de consumo registrada');
                            log.debug('Respuesta sgcweb política de consumo', responseConsumptionPolicy.info);

                            // Se da de alta el consumidor junto con su política de consumo recién creada
                            typeModule = "Consumidores";
                            action = "registrar";
                            dataConsumer = setDataConsumer(rowCustomer, customerInfo, dataConsumptionPolicy.identificador_externo, dataCustomer.identificador_externo, allAddress[j], actionType);
                            responseConsumer = registerSgcData(xmlContent, idToken, typeModule, action, dataConsumer);
                            log.debug('Info', 'Entró a registrar un consumidor');

                            if (["1111", "0000"].includes(responseConsumer.code[0].textContent) ) {
                                log.debug('SGC', 'Consumidor registrado correctamente');
                                let realResult = JSON.parse(responseConsumer.info[0].textContent);
                                log.debug('Respuesta sgcweb consumidor', realResult);
                                log.debug('Número de consumidor de sgcweb', realResult.numero_consumidor);
        
                                // Se edita el campo custentity_ptg_numero_consumidor para empatarlo con SGC Web
                                // record.submitFields({
                                //     type: record.Type.CUSTOMER,
                                //     id: rowCustomer.id,
                                //     values: {
                                //         'custentity_ptg_codigodecliente_': realResult.numero_consumidor
                                //     }
                                // });
                                // log.debug('Actualización', 'Código de cliente actualizado');
                            } else {
                                log.debug('Ocurrió un error en consumidores', responseConsumer.code[0].textContent);
                            }
                        } else {
                            log.debug('Ocurrió un error en políticas de consumo', responseConsumptionPolicy.code[0].textContent);
                        }

                        
                    }
                    
                    return {'msg':'Éxito guardando datos en SGC web', 'status' : 'success'};
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

        // Configura los datos a enviar del cliente a SGC web
        const setDataCustomer = (rowCustomer, aditionalCustomerInfo = false, politicaId, defaultAddress, type) => {
            // log.debug('info', 'entró a la función de configurar la información del cliente');

            let entityId  = aditionalCustomerInfo.entityid;
            let nombre    = ( type == 'edit' ? rowCustomer.getText({fieldId:'altname'}) : aditionalCustomerInfo?.altname );
            // let nombre    = ( type == 'edit' ? rowCustomer.getText({fieldId:'companyname'}) : aditionalCustomerInfo?.companyname );
            let rfc       = ( type == 'edit' ? rowCustomer.getText({fieldId:'custentity_mx_rfc'}) : rowCustomer.getValue({fieldId:'custentity_mx_rfc'}) );
            // let telefono1 = ( type == 'edit' ? rowCustomer.getText({fieldId:'phone'}) : rowCustomer.getValue({fieldId:'phone'}) );
            let telefono2 = ( type == 'edit' ? rowCustomer.getText({fieldId:'altphone'}) : rowCustomer.getValue({fieldId:'altphone'}) );
            let email     = ( type == 'edit' ? rowCustomer.getText({fieldId:'email'}) : rowCustomer.getValue({fieldId:'email'}) );
            let saldo     = ( type == 'edit' ? rowCustomer.getText({fieldId:'balance'}) : rowCustomer.getValue({fieldId:'balance'}) );
            saldo = ( saldo ? Number( parseFloat( saldo ).toFixed(2) ) : 0.00);

            let data = {
                "numero_cliente":"",
                "identificador_externo": entityId,
                "nombre":nombre ? nombre : "Nombre cliente",
                "rfc":rfc ? rfc : "XAXX010101000",
                "calle":defaultAddress.calle ?? "",
                "no_exterior":defaultAddress.numExt ?? "",
                "no_interior":defaultAddress.numInt ?? "",
                "colonia":defaultAddress.colonia ?? "",
                "localidad":defaultAddress.ciudad ?? "",
                "referencia":defaultAddress.entreCalle1 ?? "",
                "ciudad":defaultAddress.ciudad ?? "",
                "estado":defaultAddress.estado ?? "",
                "codigo_postal":( defaultAddress.codigo_postal ?? "31135" ),
                "pais":defaultAddress.pais ?? "",
                "telefono1":defaultAddress.telefonoPrincipal ??  "4448111213",
                "telefono2":telefono2 ?? "",
                "activo":"1",
                "email":email ?? "",
                "saldo":saldo,
                "politica_venta_id":politicaId ?? ""
            };

            log.debug('Data customer', data);

            return data;
        }

        // Configura los datos a enviar del consumidor a SGC web
        const setDataConsumer = (rowCustomer, aditionalCustomerInfo = false, politicaId, clienteId, address, type) => {
            // log.debug('info', 'entró a la función de configurar la información del cliente');

            let entityId   = aditionalCustomerInfo.entityid;
            let nombre     = ( type == 'edit' ? rowCustomer.getText({fieldId:'altname'}) : aditionalCustomerInfo.altname ?? 'Consumidor genérico' );
            // let telefono1  = ( type == 'edit' ? rowCustomer.getText({fieldId:'phone'}) : aditionalCustomerInfo.phone ?? 'industrial' );
            let telefono2  = ( type == 'edit' ? rowCustomer.getText({fieldId:'altphone'}) : aditionalCustomerInfo.altphone ?? '' );
            let email      = ( type == 'edit' ? rowCustomer.getText({fieldId:'email'}) : aditionalCustomerInfo.email ?? 'anymail@gmail.com' );
            let saldo      = ( type == 'edit' ? rowCustomer.getText({fieldId:'balance'}) : aditionalCustomerInfo.balance ?? 0 );
            saldo = ( saldo ? Number( parseFloat( saldo ).toFixed(2) ) : 0.00);

            let calle = address.calle;
            address.numExt ? calle += ' NO. EXT. '+ address.numExt : '';
            address.numInt ? calle += ' NO. INT. '+ address.numInt : '';

            let data = {
                "numero_consumidor":"",
                "identificador_externo": entityId+'-'+address.etiqueta,
                // "identificador_externo": "0000"+address.id+address.etiqueta,
                "nombres":nombre ? nombre : "Nombre consumidor",
                "apellidos":".",
                "telefono1":address.telefonoPrincipal ?? "industrial",
                "telefono2":telefono2 ?? "",
                "descripcion":"Consumidor de cliente "+clienteId,
                "comentario" :"",
                "calle_numero":calle ? calle : "",
                "colonia":address.colonia ?? "",
                "ciudad":address.ciudad ?? "",
                "estado":address.estado ?? "",
                "pais":address.pais ?? "",
                "codigo_postal":( address.codigo_postal ?? "31135" ),
                "email":email ?? "",
                "saldo":saldo,
                "tipo_consumidor_id":"",
                "politica_consumo_id":politicaId ?? "",
                "cliente_id":clienteId,
                "capacidad":"150",
                "tipo_pago":"",
                "numero_verificador":"",
                "ruta_id":""
            };
            // Falta la lógica para obtener la ruta asignada, tipo de cliente (campo tipo_consumidor)

            log.debug('info consumidor', data);

            return data;
        }

        // Configura los datos a enviar para las políticas de consumo
        const setDataSalesPolicy = (rowCustomer, aditionalConsumerInfo = false, type) => {
            // log.debug('info', 'entró a la función de setear la política de venta');
            let limite_credito = 250000;
            // let limite_credito = ( type == 'edit' ? rowCustomer.getValue({fieldId: 'creditlimit'}) : rowCustomer.getValue({fieldId: 'creditlimit'}) );
            let tipo_pago      = ( type == 'edit' ? rowCustomer.getValue({fieldId: 'custentity_ptg_alianza_comercial_cliente'}) : rowCustomer.getValue({fieldId:'custentity_ptg_alianza_comercial_cliente'}) );
            let identificador  = tipo_pago == 2 ? 'CREDITO_DEFAULT' : 'CONTADO';
            // limite_credito = ( limite_credito ? Number( parseFloat(limite_credito) ) : '' );
            tipo_pago      = ( tipo_pago == 2 ? 2 : ( tipo_pago == 3 ? 1 : 1 ) );

            let data = {
                // "nombre":"Política de venta para cliente 0000"+rowCustomer.id,
                "nombre":identificador,
                // "identificador_externo":"PV0000"+rowCustomer.id,
                "identificador_externo":identificador,
                "activa":"1",
                "tipo_pago":tipo_pago,
                "limite_credito":identificador == 'CONTADO' ? 0 : limite_credito,
                "numero_semanas_credito":1,
                "frecuencia_factura":0,
                "facturar_todos_servicios":0,
                "facturar_servicios_vpg":0,
                "recordatorio_pago":0,
                "recordatorio_pago_dias":0,
                "notificar_limite_credito":0,
                "bloqueo_morosidad":0
            };

            log.debug('info política de venta', data);

            return data;
        }

        // Configura los datos a enviar para las políticas de consumo
        const setDataConsumptionPolicy = (rowCustomer, address, type) => {
            // log.debug('info', 'entró a la función de configurar la información del cliente');

            let nombre = address.territorioZona;
            let limite_credito = ( type == 'edit' ? rowCustomer.getText({fieldId:'creditlimit'}) : rowCustomer.getValue({fieldId:'creditlimit'}) );
            let descuento = ( type == 'edit' ? rowCustomer.getValue({fieldId:'custentity_ptg_descuento_asignar'}) : rowCustomer.getValue({fieldId:'custentity_ptg_descuento_asignar'}) );
            log.debug('Descuento en politica consumo', descuento);
            let splitDesc = ( descuento ? descuento.split('.') : '00');
            limite_credito = (limite_credito ? Number(parseInt(limite_credito)) : 0.00);
            let centavos = Number( parseInt( ( splitDesc[1] ? splitDesc[1] : '00' ) ).toFixed(2) );


            if ( centavos < 10 ) {
                centavos = '0'.concat(centavos);
            } else {
                // 
            }
            // centavos = ( centavos == '00' ? '00' : );
            // Mejorar lógica para aplicar los descuentos aquí

            let data = {
                "nombre":nombre,
                "identificador_externo":"L"+(centavos)+nombre,
                "activa":"1",
                "tipo_pago":0,
                "limite_credito":limite_credito,
                "hora_inicial":"00:00",
                "hora_final":"23:45",
                "numero_servicios":1,
                "restringir_gps":0,
                "restringir_tag":0,
                "impuesto_id":"",
                "descuento_id":"",
                "ticket_servicios_id":""
            };

            log.debug('info política de consumo', data);

            return data;
        }

        // Query que obtiene las direcciones del cliente creado
        const searchCustomerAddresses = (customerId) => {
            let addressObj = {
                default : '',
                addresses : []
            };
            let sql = 
            'SELECT customerAddressbook.entity as idCliente, customerAddressbook.internalId as idDireccion, zip, customerAddressbook.label as etiqueta,'+
            'customerAddressbook.defaultshipping as envioPredeterminado, customerAddressbook.defaultbilling as facturacionPredeterminada,'+
            'customerAddressbookEntityAddress.custrecord_ptg_colonia_ruta as idColoniaRuta, customerAddressbookEntityAddress.custrecord_ptg_nombre_colonia as nombreColonia,'+
            'customerAddressbookEntityAddress.custrecord_ptg_exterior_number as numeroExterior, customerAddressbookEntityAddress.custrecord_ptg_interior_number as numeroInterior,'+
            'customerAddressbookEntityAddress.custrecord_ptg_estado as estado, customerAddressbookEntityAddress.city as ciudad, customerAddressbookEntityAddress.country as pais,'+
            'customerAddressbookEntityAddress.custrecord_ptg_street as calle, '+
            'customerAddressbookEntityAddress.custrecord_ptg_entrecalle_ as entreCalle1, customerAddressbookEntityAddress.custrecord_ptg_y_entre_ as entreCalle2,'+
            'customerAddressbookEntityAddress.custrecord_ptg_telefono_principal as telefonoPrincipal,'+
            'CUSTOMRECORD_PTG_COLONIASRUTAS_.custrecord_ptg_zona_de_precio_ as idZonaPrecio,'+
            'CUSTOMRECORD_PTG_ZONASDEPRECIO_.name as nombreZona, CUSTOMRECORD_PTG_ZONASDEPRECIO_.custrecord_ptg_precio_ as precioZona, custrecord_ptg_territorio_ as territorioZona '+

            'FROM customerAddressbook '+

            'left join customerAddressbookEntityAddress on customerAddressbook.addressbookaddress = customerAddressbookEntityAddress.nkey '+
            'left join CUSTOMRECORD_PTG_COLONIASRUTAS_ on customerAddressbookEntityAddress.custrecord_ptg_colonia_ruta = CUSTOMRECORD_PTG_COLONIASRUTAS_.id '+
            'left join CUSTOMRECORD_PTG_ZONASDEPRECIO_ on CUSTOMRECORD_PTG_COLONIASRUTAS_.custrecord_ptg_zona_de_precio_ = CUSTOMRECORD_PTG_ZONASDEPRECIO_.id '+

            'WHERE customerAddressbook.entity ='+ customerId;

            let resultIterator = query.runSuiteQLPaged({
                query: sql,
                pageSize: 1000
            }).iterator();

            resultIterator.each(function (page) {
                let pageIterator = page.value.data.iterator();
                pageIterator.each(function (row) {
                    let address = {};
                    // log.debug('Row de query pura', row);
                    if(!!row.value.getValue(0)) {
                        address.id = row.value.getValue(1);
                        address.codigo_postal = row.value.getValue(2);
                        address.etiqueta = row.value.getValue(3);
                        address.defaultShipping = row.value.getValue(4);
                        address.defaultBilling = row.value.getValue(5);
                        address.colonia = row.value.getValue(7);
                        address.numExt = row.value.getValue(8);
                        address.numInt = row.value.getValue(9);
                        address.estado = row.value.getValue(10);
                        address.ciudad = row.value.getValue(11);
                        address.pais = row.value.getValue(12);
                        address.calle = row.value.getValue(13);
                        address.entreCalle1 = row.value.getValue(14);
                        address.entreCalle2 = row.value.getValue(15);
                        address.telefonoPrincipal = row.value.getValue(16);
                        address.idZona = row.value.getValue(17);
                        address.nombreZona = row.value.getValue(18);
                        address.precioZona = row.value.getValue(19);
                        address.territorioZona = row.value.getValue(20);
                        // obj.text = `${row.value.getValue(1)} - ${row.value.getValue(2)} - ${row.value.getValue(3)}`;
                        
                        // Es la dirección por default
                        if ( address.defaultShipping == "T" ) {
                            addressObj.default = address;
                        }
                        // Se hace el push del objeto de la dirección al arreglo de direcciones a retornar
                        addressObj.addresses.push(address);
                    }
                    
                    return true;
                });
                return true;
            });

            // log.debug('Data sql', data);

            return addressObj;
        }

        // Guarda / actualiza un cliente en SGC web
        const registerSgcData = (xmlContent, idToken, typeModule, action, data) => {
            log.debug('data', data);
            log.debug('typeModule', typeModule);
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

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
