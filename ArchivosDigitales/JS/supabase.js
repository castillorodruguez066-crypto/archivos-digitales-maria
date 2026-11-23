(function (global) {
    'use strict';

    var supabaseLocal = {
        createClient: function (url, key) {
            var tokenActual = localStorage.getItem('sb_token') || key;

            return {
                // Manejo de Sesiones
                auth: {
                    signInWithPassword: function (creds) {
                        return fetch(url + '/auth/v1/token?grant_type=password', {
                            method: 'POST',
                            headers: { 'apikey': key, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: creds.email, password: creds.password })
                        }).then(function (r) {
                            return r.json().then(function (d) {
                                if (r.ok) {
                                    localStorage.setItem('sb_token', d.access_token);
                                    localStorage.setItem('sb_user', JSON.stringify(d.user));
                                    tokenActual = d.access_token;
                                    return { data: { session: d, user: d.user }, error: null };
                                }
                                return { data: null, error: { message: d.error_description || 'Credenciales incorrectas' } };
                            });
                        });
                    },
                    signUp: function (creds) {
                        return fetch(url + '/auth/v1/signup', {
                            method: 'POST',
                            headers: { 'apikey': key, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: creds.email, password: creds.password })
                        }).then(function (r) {
                            return r.json().then(function (d) {
                                if (r.ok && d.access_token) {
                                    localStorage.setItem('sb_token', d.access_token);
                                    localStorage.setItem('sb_user', JSON.stringify(d.user));
                                    tokenActual = d.access_token;
                                    return { data: { session: d, user: d.user }, error: null };
                                }
                                return { data: null, error: { message: d.msg || 'Error al registrar. Apaga Confirm Email en Supabase.' } };
                            });
                        });
                    },
                    getSession: function () {
                        var token = localStorage.getItem('sb_token');
                        var user = JSON.parse(localStorage.getItem('sb_user') || 'null');
                        return Promise.resolve({
                            data: { session: token ? { access_token: token, user: user } : null }
                        });
                    },
                    signOut: function () {
                        localStorage.removeItem('sb_token');
                        localStorage.removeItem('sb_user');
                        return Promise.resolve({ error: null });
                    }
                },

                // Almacenamiento de Documentos y Fotos
                storage: {
                    from: function (bucket) {
                        return {
                            upload: function (path, file) {
                                return fetch(url + '/storage/v1/object/' + bucket + '/' + path, {
                                    method: 'POST',
                                    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key },
                                    body: file
                                }).then(function (r) {
                                    return r.json().then(function (d) {
                                        return { data: r.ok ? d : null, error: r.ok ? null : d };
                                    });
                                });
                            },
                            getPublicUrl: function (path) {
                                return { data: { publicUrl: url + '/storage/v1/object/public/' + bucket + '/' + path } };
                            }
                        };
                    }
                },

                // Peticiones a la Base de Datos
                from: function (tableName) {
                    var authHeaders = { 'apikey': key, 'Authorization': 'Bearer ' + tokenActual, 'Content-Type': 'application/json' };
                    return {
                        select: function (columns) {
                            return {
                                order: function (column, options) {
                                    return fetch(url + '/rest/v1/' + tableName + '?select=' + (columns || '*') + '&order=' + column + '.' + (options.ascending ? 'asc' : 'desc'), {
                                        method: 'GET',
                                        headers: authHeaders
                                    }).then(function (r) { return r.json().then(function (d) { return { data: d, error: r.ok ? null : d }; }); });
                                }
                            };
                        },
                        insert: function (rows) {
                            return fetch(url + '/rest/v1/' + tableName, {
                                method: 'POST',
                                headers: Object.assign({}, authHeaders, { 'Prefer': 'return=representation' }),
                                body: JSON.stringify(rows)
                            }).then(function (r) { return r.json().then(function (d) { return { data: d, error: r.ok ? null : d }; }); });
                        },
                        update: function (values) {
                            return {
                                eq: function (column, value) {
                                    return fetch(url + '/rest/v1/' + tableName + '?' + column + '=eq.' + value, {
                                        method: 'PATCH',
                                        headers: Object.assign({}, authHeaders, { 'Prefer': 'return=representation' }),
                                        body: JSON.stringify(values)
                                    }).then(function (r) { return r.json().then(function (d) { return { data: d, error: r.ok ? null : d }; }); });
                                }
                            };
                        },
                        delete: function () {
                            return {
                                eq: function (column, value) {
                                    return fetch(url + '/rest/v1/' + tableName + '?' + column + '=eq.' + value, {
                                        method: 'DELETE',
                                        headers: authHeaders
                                    }).then(function (r) { return { error: r.ok ? null : { message: 'Error al eliminar' } }; });
                                }
                            };
                        }
                    };
                }
            };
        }
    };

    global.supabase = supabaseLocal;
})(window);
