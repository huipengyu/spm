var should = require('should');
var path = require('path');
var fsExt = require('../../lib/utils/fs_ext.js');
require('../module.js');

describe('project model parse test', function() {
  var spmConfigTestModuleDir = path.join(path.dirname(module.filename), "../data/modules/spmConfigTest/");
  var spmConfigTestCustomId= path.join(path.dirname(module.filename), "../data/action_test_data/test_custom_id");

  describe('spm config parse', function() {
    it('att parse', function(done) {
      getProjectModel(spmConfigTestModuleDir, function(model) {
        model.name.should.eql('spmConfigModel');
        model.version.should.eql('0.0.1');

        model.getConfig('abc').should.eql('abc/0.0.1');
        model.getConfig('to').should.eql('abc/0.0.1/def/app');
        done();
      });
    });

    it('test spmConfig parse for common config', function(done) {
      getProjectModel('deploy', spmConfigTestModuleDir, function(model) {
        model.name.should.eql('spmConfigModel');
        model.version.should.eql('0.0.1');

        should.not.exist(model.getConfig('abc'));
        should.not.exist(model.getConfig('to'));

        model.getConfig('idRule').should.eql('{{moduleName}}');
        model.getModuleId('module').should.eql('module');
        done();
      });
    });

    it('test custom id rule', function() {
      getProjectModel('build', spmConfigTestCustomId, function(model) {
         model.getModuleId('a').should.eql('a/1.0.0');
      });
    });
  });

});
