/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {isNode, zoneSymbol} from '../../lib/common/utils';
declare const global: any;

describe('setTimeout', function() {
  it('should intercept setTimeout', function(done) {
    let cancelId: any;
    const testZone = Zone.current.fork((Zone as any)['wtfZoneSpec']).fork({name: 'TestZone'});
    testZone.run(() => {
      let id: number;
      const timeoutFn = function() {
        expect(Zone.current.name).toEqual(('TestZone'));
        global[zoneSymbol('setTimeout')](function() {
          expect(wtfMock.log).toEqual([
            '# Zone:fork("<root>::ProxyZone::WTF", "TestZone")',
            '> Zone:invoke:unit-test("<root>::ProxyZone::WTF::TestZone")',
            '# Zone:schedule:macroTask:setTimeout("<root>::ProxyZone::WTF::TestZone", ' + id + ')',
            '< Zone:invoke:unit-test',
            '> Zone:invokeTask:setTimeout("<root>::ProxyZone::WTF::TestZone")',
            '< Zone:invokeTask:setTimeout'
          ]);
          done();
        });
      };
      expect(Zone.current.name).toEqual(('TestZone'));
      cancelId = setTimeout(timeoutFn, 3);
      if (isNode) {
        expect(typeof cancelId.ref).toEqual(('function'));
        expect(typeof cancelId.unref).toEqual(('function'));
      }
      // This icky replacer is to deal with Timers in node.js. The data.handleId contains timers in
      // node.js. They do not stringify properly since they contain circular references.
      id = JSON.stringify((<MacroTask>cancelId).data, function replaceTimer(key, value) {
        if (key == 'handleId' && typeof value == 'object') return value.constructor.name;
        if (typeof value === 'function') return value.name;
        return value;
      }) as any as number;
      expect(wtfMock.log).toEqual([
        '# Zone:fork("<root>::ProxyZone::WTF", "TestZone")',
        '> Zone:invoke:unit-test("<root>::ProxyZone::WTF::TestZone")',
        '# Zone:schedule:macroTask:setTimeout("<root>::ProxyZone::WTF::TestZone", ' + id + ')'
      ]);
    }, null, null, 'unit-test');
  });

  it('should allow canceling of fns registered with setTimeout', function(done) {
    const testZone = Zone.current.fork((Zone as any)['wtfZoneSpec']).fork({name: 'TestZone'});
    testZone.run(() => {
      const spy = jasmine.createSpy('spy');
      const cancelId = setTimeout(spy, 0);
      clearTimeout(cancelId);
      setTimeout(function() {
        expect(spy).not.toHaveBeenCalled();
        done();
      }, 1);
    });
  });

  it('should allow cancelation of fns registered with setTimeout after invocation', function(done) {
    const testZone = Zone.current.fork((Zone as any)['wtfZoneSpec']).fork({name: 'TestZone'});
    testZone.run(() => {
      const spy = jasmine.createSpy('spy');
      const cancelId = setTimeout(spy, 0);
      setTimeout(function() {
        expect(spy).toHaveBeenCalled();
        setTimeout(function() {
          clearTimeout(cancelId);
          done();
        });
      }, 1);
    });
  });

  it('should allow cancelation of fns while the task is being executed', function(done) {
    const spy = jasmine.createSpy('spy');
    const cancelId = setTimeout(() => {
      clearTimeout(cancelId);
      done();
    }, 0);
  });

  it('should allow cancelation of fns registered with setTimeout during invocation',
     function(done) {
       const testZone = Zone.current.fork((Zone as any)['wtfZoneSpec']).fork({name: 'TestZone'});
       testZone.run(() => {
         const cancelId = setTimeout(function() {
           clearTimeout(cancelId);
           done();
         }, 0);
       });
     });

  it('should return the timeout Id through toString', function() {
    // Node returns complex object from setTimeout, ignore this test.
    if (isNode) return;
    const cancelId = setTimeout(() => {}, 0);
    expect(typeof(cancelId.toString())).toBe('number');
  });

  it('should allow cancelation by numeric timeout Id', function(done) {
    // Node returns complex object from setTimeout, ignore this test.
    if (isNode) {
      done();
      return;
    }

    const testZone = Zone.current.fork((Zone as any)['wtfZoneSpec']).fork({name: 'TestZone'});
    testZone.run(() => {
      const spy = jasmine.createSpy('spy');
      const task: Task = <any>setTimeout(spy, 0);
      const cancelId: number = <any>task;
      clearTimeout(cancelId);
      setTimeout(function() {
        expect(spy).not.toHaveBeenCalled();
        expect(task.runCount).toEqual(0);
        done();
      }, 1);
    });
  });

  it('should pass invalid values through', function() {
    clearTimeout(null);
    clearTimeout(<any>{});
  });

});
