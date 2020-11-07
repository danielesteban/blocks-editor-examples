// A copy of https://github.com/mrdoob/three.js/blob/master/examples/jsm/physics/AmmoPhysics.js
// + an extra applyImpulse(mesh, impulse, index) method
// + an extra reset() method
// + Extra flags on: addMesh( mesh, mass = 0, flags = {} )
//   - noContactResponse
//   - isKinematic
//   - isTrigger

import { DynamicDrawUsage, Quaternion, Vector3 } from './three.js';

async function AmmoPhysics() {

  if ( 'Ammo' in window === false ) {

    console.error( 'AmmoPhysics: Couldn\'t find Ammo.js' );
    return;

  }

  const AmmoLib = await window.Ammo();

  const frameRate = 60;

  const collisionConfiguration = new AmmoLib.btDefaultCollisionConfiguration();
  const dispatcher = new AmmoLib.btCollisionDispatcher( collisionConfiguration );
  const broadphase = new AmmoLib.btDbvtBroadphase();
  const solver = new AmmoLib.btSequentialImpulseConstraintSolver();
  const world = new AmmoLib.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
  world.setGravity( new AmmoLib.btVector3( 0, - 9.8, 0 ) );

  const worldTransform = new AmmoLib.btTransform();

  const auxVector = new AmmoLib.btVector3();
  const auxQuaternion = new AmmoLib.btQuaternion();
  const zero = new AmmoLib.btVector3( 0, 0, 0 );

  //

  function getShape( geometry ) {

    const parameters = geometry.parameters;

    // TODO change type to is*

    if ( geometry.physics && geometry.physics.shape === 'box' ) {
  
      const shape = new AmmoLib.btBoxShape( new AmmoLib.btVector3( ...geometry.physics.size ) );
      shape.setMargin( 0.05 );

      return shape;

    }

    if ( geometry.physics && geometry.physics.shape === 'sphere' ) {
  
      const shape = new AmmoLib.btSphereShape( geometry.physics.radius );
      shape.setMargin( 0.05 );

      return shape;

    }

    if ( geometry.type === 'BoxBufferGeometry' ) {

      const sx = parameters.width !== undefined ? parameters.width / 2 : 0.5;
      const sy = parameters.height !== undefined ? parameters.height / 2 : 0.5;
      const sz = parameters.depth !== undefined ? parameters.depth / 2 : 0.5;

      const shape = new AmmoLib.btBoxShape( new AmmoLib.btVector3( sx, sy, sz ) );
      shape.setMargin( 0.05 );

      return shape;

    }
    
    if ( geometry.type === 'SphereBufferGeometry' || geometry.type === 'IcosahedronBufferGeometry' ) {

      const radius = parameters.radius !== undefined ? parameters.radius : 1;

      const shape = new AmmoLib.btSphereShape( radius );
      shape.setMargin( 0.05 );

      return shape;

    }

    return null;

  }

  const shapes = [];
  const dynamic = [];
  const kinematic = [];
  const meshes = [];
  const meshMap = new WeakMap();

  function addMesh( mesh, mass = 0, flags = {} ) {

    const shape = getShape( mesh.geometry );

    if ( shape !== null ) {

      if ( mesh.isInstancedMesh ) {

        handleInstancedMesh( mesh, mass, flags, shape );

      } else if ( mesh.isMesh ) {

        handleMesh( mesh, mass, flags, shape );

      } else {

        Ammo.destroy(shape);

      }

    }

  }

  function handleMesh( mesh, mass, flags, shape ) {

    const position = mesh.position;
    const quaternion = mesh.quaternion;

    const transform = new AmmoLib.btTransform();
    transform.setIdentity();
    transform.setOrigin( new AmmoLib.btVector3( position.x, position.y, position.z ) );
    transform.setRotation( new AmmoLib.btQuaternion( quaternion.x, quaternion.y, quaternion.z, quaternion.w ) );

    const motionState = new AmmoLib.btDefaultMotionState( transform );

    const localInertia = new AmmoLib.btVector3( 0, 0, 0 );
    shape.calculateLocalInertia( mass, localInertia );

    const rbInfo = new AmmoLib.btRigidBodyConstructionInfo( mass, motionState, shape, localInertia );

    const body = new AmmoLib.btRigidBody( rbInfo );
    body.mesh = mesh;
    body.isTrigger = flags.isTrigger;

    if (flags.noContactResponse) {
    
      const CF_NO_CONTACT_RESPONSE = 4;
      body.setCollisionFlags( body.getCollisionFlags() | CF_NO_CONTACT_RESPONSE );
    
    }

    if (flags.isKinematic) {

      const CF_KINEMATIC_OBJECT = 2;
      body.setCollisionFlags( body.getCollisionFlags() | CF_KINEMATIC_OBJECT );

    }

    if ( mass > 0 ) {
    
      const DISABLE_DEACTIVATION = 4;
      body.setActivationState( DISABLE_DEACTIVATION );
  
    }

    // body.setFriction( 4 );
    world.addRigidBody( body );

    meshes.push(mesh);
    meshMap.set( mesh, body );
    shapes.push(shape);
  
    if (flags.isKinematic) {

      kinematic.push( mesh );

    }

    if ( mass > 0 ) {

      dynamic.push( mesh );

    }

  }

  function handleInstancedMesh( mesh, mass, flags, shape ) {

    const array = mesh.instanceMatrix.array;

    const instances = [];

    for ( let i = 0; i < mesh.count; i ++ ) {

      const index = i * 16;

      const transform = new AmmoLib.btTransform();
      transform.setFromOpenGLMatrix( array.slice( index, index + 16 ) );

      const motionState = new AmmoLib.btDefaultMotionState( transform );

      const localInertia = new AmmoLib.btVector3( 0, 0, 0 );
      shape.calculateLocalInertia( mass, localInertia );

      const rbInfo = new AmmoLib.btRigidBodyConstructionInfo( mass, motionState, shape, localInertia );

      const body = new AmmoLib.btRigidBody( rbInfo );
      body.mesh = mesh;
      body.index = i;
      body.isTrigger = flags.isTrigger;

      if (flags.noContactResponse) {
      
        const CF_NO_CONTACT_RESPONSE = 4;
        body.setCollisionFlags( body.getCollisionFlags() | CF_NO_CONTACT_RESPONSE );
      
      }
  
      if (flags.isKinematic) {
  
        const CF_KINEMATIC_OBJECT = 2;
        body.setCollisionFlags( body.getCollisionFlags() | CF_KINEMATIC_OBJECT );
  
      }

      if ( mass > 0 ) {
    
        const DISABLE_DEACTIVATION = 4;
        body.setActivationState( DISABLE_DEACTIVATION );
    
      }

      world.addRigidBody( body );

      instances.push( body );

    }

    meshes.push(mesh);
    meshMap.set( mesh, instances );
    shapes.push(shape);

    if (flags.isKinematic) {

      kinematic.push( mesh );

    }

    if ( mass > 0 ) {

      mesh.instanceMatrix.setUsage( DynamicDrawUsage );
      dynamic.push( mesh );
  
    }

  }

  //

  function setMeshPosition( mesh, position, index = 0 ) {

    let body;

    if ( mesh.isInstancedMesh ) {

      const bodies = meshMap.get( mesh );
      body = bodies[ index ];

    } else if ( mesh.isMesh ) {

      body = meshMap.get( mesh );

    }
    
    if ( body ) {

      body.setAngularVelocity( zero );
      body.setLinearVelocity( zero );

      worldTransform.setIdentity();
      auxVector.setValue( position.x, position.y, position.z );
      worldTransform.setOrigin( auxVector );
      body.setWorldTransform( worldTransform );

    }
  }

  function applyImpulse( mesh, impulse, index = 0 ) {

    let body;
  
    if ( mesh.isInstancedMesh ) {

      const bodies = meshMap.get( mesh );
      body = bodies[ index ];

    } else if ( mesh.isMesh ) {

      body = meshMap.get( mesh );

    }

    if ( body ) {

      auxVector.setValue( impulse.x, impulse.y, impulse.z );
      body.applyImpulse( auxVector, zero );

    }
  }

  function reset() {

    meshes.forEach((mesh) => {

      if ( mesh.isInstancedMesh ) {

        const array = mesh.instanceMatrix.array;
        const instances = meshMap.get( mesh );

        for ( let j = 0; j < instances.length; j ++ ) {

          const body = instances[ j ];
          const motionState = body.getMotionState();
          world.removeRigidBody(body);
          Ammo.destroy(motionState);
          Ammo.destroy(body);

        }

      } else if ( mesh.isMesh ) {

        const body = meshMap.get( mesh );
        const motionState = body.getMotionState();
        world.removeRigidBody(body);
        Ammo.destroy(motionState);
        Ammo.destroy(body);

      }
      
      meshMap.delete(mesh);

    });

    shapes.forEach((shape) => (
      Ammo.destroy(shape)
    ));

    meshes.length = 0;
    dynamic.length = 0;
    kinematic.length = 0;
    shapes.length = 0;

  }

  const worldspace = {
    position: new Vector3(),
    quaternion: new Quaternion(),
    scale: new Vector3(),
  };

  //

  let lastTime = 0;

  function step() {

    for ( let i = 0, l = kinematic.length; i < l; i ++ ) {

      const mesh = kinematic[ i ];

      if ( mesh.isInstancedMesh ) {

        // TODO: Update kinematic instances bodies

      } else if ( mesh.isMesh ) {

        const body = meshMap.get( mesh );

        mesh.matrixWorld.decompose(worldspace.position, worldspace.quaternion, worldspace.scale);

        worldTransform.setIdentity();
        auxVector.setValue( worldspace.position.x, worldspace.position.y, worldspace.position.z );
        worldTransform.setOrigin( auxVector );
        auxQuaternion.setValue( worldspace.quaternion.x, worldspace.quaternion.y, worldspace.quaternion.z, worldspace.quaternion.w );
        worldTransform.setRotation( auxQuaternion );

        body.setWorldTransform(worldTransform);
      }
    
    }

    const time = performance.now();

    if ( lastTime > 0 ) {

      const delta = ( time - lastTime ) / 1000;

      // console.time( 'world.step' );
      world.stepSimulation( delta, 10 );
      // console.timeEnd( 'world.step' );

    }

    lastTime = time;

    //

    for ( let i = 0, l = dynamic.length; i < l; i ++ ) {

      const mesh = dynamic[ i ];

      if ( mesh.isInstancedMesh ) {

        const array = mesh.instanceMatrix.array;
        const bodies = meshMap.get( mesh );

        for ( let j = 0; j < bodies.length; j ++ ) {

          const body = bodies[ j ];

          const motionState = body.getMotionState();
          motionState.getWorldTransform( worldTransform );

          const position = worldTransform.getOrigin();
          const quaternion = worldTransform.getRotation();

          compose( position, quaternion, array, j * 16 );

        }

        mesh.instanceMatrix.needsUpdate = true;

      } else if ( mesh.isMesh ) {

        const body = meshMap.get( mesh );

        const motionState = body.getMotionState();
        motionState.getWorldTransform( worldTransform );

        const position = worldTransform.getOrigin();
        const quaternion = worldTransform.getRotation();
        mesh.position.set( position.x(), position.y(), position.z() );
        mesh.quaternion.set( quaternion.x(), quaternion.y(), quaternion.z(), quaternion.w() );

      }

    }

    for ( let i = 0, il = dispatcher.getNumManifolds(); i < il; i ++ ) {

      const contactManifold = dispatcher.getManifoldByIndexInternal( i );
      const bodyA = Ammo.castObject( contactManifold.getBody0(), Ammo.btRigidBody );
      const bodyB = Ammo.castObject( contactManifold.getBody1(), Ammo.btRigidBody );
      
      if (
        bodyA.isTrigger || bodyB.isTrigger
      ) {

        let body;
        let trigger;

        if (bodyA.isTrigger) {

          body = bodyB;
          trigger = bodyA;

        } else if (bodyB.isTrigger) {

          body = bodyA;
          trigger = bodyB;

        }

        if (trigger) {

          let contact = false;

          for ( let j = 0, jl = contactManifold.getNumContacts(); j < jl; j ++ ) {

            const contactPoint = contactManifold.getContactPoint( j );

            if ( contactPoint.getDistance() < 0 ) {

              const position = contactPoint.get_m_positionWorldOnA();
              contact = { x: position.x(), y: position.y(), z: position.z() };

              break;
            
            }
      
          }

          if (contact) {

            trigger.mesh.onContact({
              trigger: trigger.index,
              mesh: body.mesh,
              index: body.index,
              point: contact,
            });

          }

        }

      }

    }

  }

  // animate

  setInterval( step, 1000 / frameRate );

  return {
    addMesh,
    setMeshPosition,
    applyImpulse,
    reset,
  };

}

function compose( position, quaternion, array, index ) {

  const x = quaternion.x(), y = quaternion.y(), z = quaternion.z(), w = quaternion.w();
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;

  array[ index + 0 ] = ( 1 - ( yy + zz ) );
  array[ index + 1 ] = ( xy + wz );
  array[ index + 2 ] = ( xz - wy );
  array[ index + 3 ] = 0;

  array[ index + 4 ] = ( xy - wz );
  array[ index + 5 ] = ( 1 - ( xx + zz ) );
  array[ index + 6 ] = ( yz + wx );
  array[ index + 7 ] = 0;

  array[ index + 8 ] = ( xz + wy );
  array[ index + 9 ] = ( yz - wx );
  array[ index + 10 ] = ( 1 - ( xx + yy ) );
  array[ index + 11 ] = 0;

  array[ index + 12 ] = position.x();
  array[ index + 13 ] = position.y();
  array[ index + 14 ] = position.z();
  array[ index + 15 ] = 1;

}

export { AmmoPhysics };
