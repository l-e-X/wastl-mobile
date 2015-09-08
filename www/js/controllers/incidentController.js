angular.module('grisu-noe').controller('incidentController',
    function($scope, $stateParams, dataService, util, $ionicModal, geoService, leafletData) {

    $scope.isMapAvailable = false;
    $scope.isMapRefreshing = false;

    $scope.layers = geoService.getStandardLayers();

    $scope.updateMapToLocation = function() {
        $scope.isMapRefreshing = true;
        var geoCodeAddress = $scope.incident.p + ' ' + $scope.incident.o + ', Niederösterreich';
        console.debug('Update of map with geocoding string: ' + geoCodeAddress);

        geoService.geocodeAddress(geoCodeAddress).then(function(data) {
            if (data.results.length == 0) {
                // no results found
                return;
            }

            var validEntry = data.results[0];

            leafletData.getMap().then(function(map) {
                map.setView(new L.LatLng(validEntry.geometry.location.lat, validEntry.geometry.location.lng), 14);

                var redIcon = L.AwesomeMarkers.icon({
                    prefix: 'ion',
                    icon: 'flame',
                    markerColor: 'red',
                    iconColor: 'white'
                });

                var marker = L.marker([validEntry.geometry.location.lat, validEntry.geometry.location.lng], { icon: redIcon });
                marker.bindPopup(validEntry.formatted_address, {
                    closeButton: false
                });

                map.addLayer(marker);

                $scope.isMapAvailable = true;
            });
        }).finally(function() {
            $scope.isMapRefreshing = false;
        });
    };

    $scope.doRefresh = function() {
        util.genericRefresh($scope, dataService.getIncidentData($stateParams.incidentId), function(data) {
            $scope.incident = data;
            $scope.bygone = util.calculateBygoneTime(data.d + ' ' + data.t, 'DD.MM.YYYY HH:mm:ss');

            // trigger only on first refresh or map isn't available
            if (!$scope.isMapAvailable) {
                $scope.updateMapToLocation();
            }
        });
    };

    $scope.$on('cordova.resume', function() {
        $scope.doRefresh();
    });

    $scope.$on('$ionicView.enter', function() {
        $scope.doRefresh();
    });

    $scope.toggleDispo = function(dispo) {
        if ($scope.isDispoShown(dispo)) {
            $scope.shownDispo = null;
        } else {
            $scope.shownDispo = dispo;
        }
    };

    $scope.isDispoShown = function(dispo) {
        if (angular.isUndefinedOrNull($scope.shownDispo)) {
            return false;
        }

        // don't compare object equality, compare name equality because of refresh
        return angular.toJson($scope.shownDispo, false) === angular.toJson(dispo, false);
    };

    $ionicModal.fromTemplateUrl('templates/incident-map.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(modal) {
        $scope.mapDialog = modal;
    });

    $scope.openMapDialog = function() {
        $scope.mapDialog.show();
    };

    $scope.closeMapDialog = function() {
        $scope.mapDialog.hide();
    };

    $scope.$on('$destroy', function() {
        $scope.mapDialog.remove();
    });
});