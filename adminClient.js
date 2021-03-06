`use strict`;

let adminClient = require('keycloak-admin-client');
const getToken = require('keycloak-request-token');
const request = require('request');

let settings = {
    baseUrl: 'http://127.0.0.1:8080/auth',
    username: 'admin',
    password: 'admin',
    grant_type: 'password',
    client_id: 'admin-cli'
};


let exampleSettings = {
    realmName: 'CAMPAIGN_REALM'
};

exports.realmsList = function (callback) {
    adminClient(settings)
        .then((client) => {
            console.log('client', client);
            client.realms.find()
                .then(callback, error(callback));
        })
        .catch(error(callback));
};

exports.usersList = function (callback) {
    adminClient(settings)
        .then((client) => {
            client.users.find(exampleSettings.realmName)
                .then(callback, error(callback));
        })
        .catch(error(callback));
};

exports.createTestUser = function (callback) {
    adminClient(settings)
        .then((client) => {
            client.users.create(exampleSettings.realmName, {
                username: 'test_user',
                firstName: 'user first name',
                enabled: true
            }).then(newUser=> {
                // TODO This is a temporary password of user
                // TODO Probably need to use the endpoint for update user and send the empty array of
                // TODO requiredActions in it.
                authenticate(token => {
                    keycloakRequest('PUT', `/admin/realms/${exampleSettings.realmName}/users/${newUser.id}/reset-password`,
                        token, {type: 'password', value: 'test_user'})
                        .then(callback.bind(null, newUser), error(callback))
                        .catch(error(callback));
                });


            }, error(callback));
        })
        .catch(error(callback));
};

exports.updateTestUser = function (callback) {
    adminClient(settings)
        .then((client) => {

            exports.findTestUser(users => {
                    let user = users && users[0];
                    if (user) {
                        user.firstName = 'user first name updated';
                        client.users.update(exampleSettings.realmName, user)
                            .then(callback.bind(null, "updated"), error(callback));
                    } else {
                        callback("not found");
                    }
                }, error(callback)
            );

        })
        .catch(error(callback));
};

exports.setTestUserCustomerId = function (callback) {
    adminClient(settings)
        .then((client) => {

            exports.findTestUser(users => {
                    let user = users && users[0];
                    if (user) {
                        user.attributes = user.attributes || {};
                        user.attributes.customerId = 123;
                        client.users.update(exampleSettings.realmName, user)
                            .then(callback.bind(null, "updated"), error(callback));
                    } else {
                        callback("not found");
                    }
                }, error(callback)
            );

        })
        .catch(error(callback));
};

exports.removeTestUserCustomerId = function (callback) {
    adminClient(settings)
        .then((client) => {

            exports.findTestUser(users => {
                    let user = users && users[0];
                    if (user) {
                        user.attributes = user.attributes || {};
                        user.attributes.customerId = undefined;
                        client.users.update(exampleSettings.realmName, user)
                            .then(callback.bind(null, "updated"), error(callback));
                    } else {
                        callback("not found");
                    }
                }, error(callback)
            );

        })
        .catch(error(callback));
};

exports.getTestUser = function (callback) {
    adminClient(settings)
        .then((client) => {

            exports.findTestUser(users => {
                    if (users && users[0] && users[0].id) {
                        client.users.find(exampleSettings.realmName, {userId: users[0].id})
                            .then(callback, error(callback));
                    } else {
                        callback("not found");
                    }
                }, error(callback)
            );

        })
        .catch(error(callback));
};

exports.findTestUser = function (callback) {
    adminClient(settings)
        .then((client) => {
            client.users.find(exampleSettings.realmName, {username: 'test_user'}).then(callback, error(callback));
        })
        .catch(error(callback));
};

exports.deleteTestUser = function (callback) {
    adminClient(settings)
        .then((client) => {

            exports.findTestUser(users => {
                    if (users && users[0] && users[0].id) {
                        client.users.remove(exampleSettings.realmName, users[0].id)
                            .then(callback.bind(null, "deleted"), error(callback));
                    } else {
                        callback("not found");
                    }
                }, error(callback)
            );

        })
        .catch(error(callback));
};

exports.deleteUserById = function (userId, callback) {
    adminClient(settings)
        .then((client) => {
            client.users.remove(exampleSettings.realmName, userId).then(callback, error(callback));
        }).catch(error(callback));
};

exports.createRole = function (callback) {
    authenticate(token => {
        keycloakRequest('POST', `/admin/realms/${exampleSettings.realmName}/roles`, token, {name: 'TEST_ROLE'})
            .then(callback.bind(null, 'created'), error(callback))
            .catch(error(callback));
    });
};

exports.addTestRoleToTestUser = function (callback) {
    exports.findTestUser(users => {
            let user = users && users[0];
            if (user) {

                authenticate(token => {
                    exports.getRoleByName('TEST_ROLE', role=> {

                        keycloakRequest('POST',
                            `/admin/realms/${exampleSettings.realmName}/users/${user.id}/role-mappings/realm`,
                            token, [role])
                            .then(callback.bind(null, 'added'), error(callback))
                            .catch(error(callback));
                    });

                });

            } else {
                callback("not found");
            }
        }, error(callback)
    );
};

exports.removeTestRoleFromTestUser = function (callback) {
    exports.findTestUser(users => {
            let user = users && users[0];
            if (user) {

                authenticate(token => {
                    exports.getRoleByName('TEST_ROLE', role=> {

                        keycloakRequest('DELETE',
                            `/admin/realms/${exampleSettings.realmName}/users/${user.id}/role-mappings/realm`,
                            token, [role])
                            .then(callback.bind(null, 'deleted'), error(callback))
                            .catch(error(callback));
                    });

                });

            } else {
                callback("not found");
            }
        }, error(callback)
    );
};

exports.getRoleByName = function (roleName, callback) {
    authenticate(token => {
        keycloakRequest('GET',
            `/admin/realms/${exampleSettings.realmName}/roles/${roleName}`,
            token, null)
            .then(callback, error(callback))
            .catch(error(callback));
    });
};

function authenticate(callback, options) {
    let params = options || settings;
    return getToken(params.baseUrl, params)
        .then(callback, error(callback));
}

function keycloakRequest(method, url, accessToken, jsonBody) {
    return new Promise((resolve, reject) => {
        let req = jsonBody != null ? {
            url: settings.baseUrl + url,
            auth: {
                bearer: accessToken
            },
            body: jsonBody,
            method: method,
            json: true
        } : {
            url: settings.baseUrl + url,
            auth: {
                bearer: accessToken
            },
            method: method,
            json: true
        };

        request(req, (err, resp, body) => {
            if (err) {
                return reject(err);
            }

            if (resp.statusCode !== 200 && resp.statusCode !== 201 && resp.statusCode !== 204) {
                return reject(body);
            }

            return resolve(body);
        });
    });
}

function error(callback) {
    return function (errorObject) {
        callback('Error: ' + JSON.stringify(errorObject, null, 4));
    };

}