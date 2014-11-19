angular.module('grisu-noe').factory('dataService', function($http, $q) {
    var config = {
        districtMapMappings: {
            '01': 'amstetten',
            '02': 'baden',
            '03': 'bruck-leitha',
            '04': 'gaenserndorf',
            '05': 'gmuend',
            '061': 'klosterneuburg',
            '062': 'purkersdorf',
            '063': 'schwechat',
            '07': 'hollabrunn',
            '08': 'horn',
            '09': 'stockerau',
            '10': 'krems',
            '11': 'lilienfeld',
            '12': 'melk',
            '13': 'mistelbach',
            '14': 'moedling',
            '15': 'neunkirchen',
            '17': 'st-poelten',
            '18': 'scheibbs',
            '19': 'tulln',
            '20': 'waidhofen-thaya',
            '21': 'wr-neustadt',
            '22': 'zwettl'
        },
        warnStates: ['none', 'low', 'medium', 'high'],
        infoScreenBaseUrl: 'https://infoscreen.florian10.info/OWS/Infoscreen/',
        wastlMobileBaseUrl: 'https://infoscreen.florian10.info/OWS/wastlMobile/',
        httpTimeout: 30000 // 30 sec. max req. time
    };

    var cache = {
        mainData: null,
        mainDataCreated: null
    };

    function processMainData(data) {
        var extension = {
            departmentCount: 0,
            incidentCount: 0,
            districtCount: 0,
            mapColorStates: []
        };

        angular.forEach(data.Bezirke, function(district) {
            extension.departmentCount += district.f;
            extension.incidentCount += district.e;

            // k = identifier of district, LWZ = 'Landeswarnzentrale', is not on map
            if (district.k == '') {
                district.k = 'LWZ';
            }

            if (district.z > 0) {
                extension.mapColorStates.push({
                    key: config.districtMapMappings[district.k],
                    value: config.warnStates[district.z]
                });
            }
        });

        extension.districtCount = extension.mapColorStates.length;

        console.debug('Extended WASTL data with', extension);
        return angular.extend(data, extension);
    }

    function createCurrentTimestamp() {
        return parseInt(Date.now() / 1000);
    }

    /**
     * Checks if cache is valid and if cache creation time isn't too old.
     */
    function isCacheAlive(cacheData, cacheTimestamp) {
        if (cacheData === null) {
            return false;
        }

        var nowTimestamp = createCurrentTimestamp();
        var timeDifference = nowTimestamp - cacheTimestamp;
        console.debug('Now timestamp', nowTimestamp);
        console.debug('Cache timestamp', cacheTimestamp);
        console.debug('Time difference in seconds', timeDifference);

        // max. age of cache is one minute
        if (cacheTimestamp === null || timeDifference >= 60) {
            return false;
        }

        return true;
    }

    return {
        getMainData: function(loadFromCache) {
            var deferred = $q.defer();

            if (loadFromCache && isCacheAlive(cache.mainData, cache.mainDataCreated)) {
                console.info('Main data loaded from cache', cache.mainData);
                deferred.resolve(cache.mainData);
                return deferred.promise;
            }

            $http.get(config.wastlMobileBaseUrl + 'getMainData.ashx', { timeout: config.httpTimeout }).success(function(data) {
                console.info('Main data loaded from server', data);
                cache.mainData = processMainData(data);
                cache.mainDataCreated = createCurrentTimestamp();
                console.debug('Updated mainData cache with timestamp', cache.mainDataCreated);
                deferred.resolve(cache.mainData);
            }).error(function(data, code) {
                deferred.reject(code, data);
                console.error('Error loading main data. Error code', code);
            });

            return deferred.promise;
        },

        getActiveIncidents: function(districtId) {
            var deferred = $q.defer();

            $http.get(config.wastlMobileBaseUrl + 'getEinsatzAktiv.ashx', {
                timeout: config.httpTimeout,
                params: {
                    id: 'bezirk_' + districtId
                }
            }).success(function(data) {
                console.info('Incident data for district "' + districtId + '" loaded from server', data);
                deferred.resolve(data);
            }).error(function(data, code) {
                deferred.reject(code, data);
                console.error('Error loading incident data for district "' + districtId + '". Error code', code);
            });

            return deferred.promise;
        },

        getConfig: function() {
            return config;
        },

        getIncidentData: function(incidentId) {
            var deferred = $q.defer();

            $http.get(config.wastlMobileBaseUrl + 'geteinsatzdata.ashx', {
                timeout: config.httpTimeout,
                params: {
                    id: incidentId
                }
            }).success(function(data) {
                console.info('Detailed data for incidentId "' + incidentId + '" loaded from server', data);
                deferred.resolve(data);
            }).error(function(data, code) {
                deferred.reject(code, data);
                console.error('Error loading detailed data for incident "' + incidentId + '". Error code', code);
            });

            return deferred.promise;
        }
    };
});