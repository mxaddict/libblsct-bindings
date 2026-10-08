use crate::macros::{impl_clone, impl_display, impl_from_retval, impl_value};
use crate::scalar::Scalar;
use crate::{
  blsct_obj::{self, BlsctObj},
  blsct_serde::BlsctSerde,
  ffi::{
    are_point_equal, deserialize_point, gen_base_point, gen_random_point, is_valid_point,
    point_from_scalar, scalar_muliply_point, serialize_point, BlsctPoint, BlsctRetVal,
  },
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct Point {
  obj: BlsctObj<Point, BlsctPoint>,
}

impl_clone!(Point);
impl_from_retval!(Point);
impl_display!(Point);

impl Point {
  pub fn base<'a>() -> Result<Self, blsct_obj::Error<'a>> {
    Self::from_retval(unsafe { gen_base_point() })
  }

  pub fn random<'a>() -> Result<Self, blsct_obj::Error<'a>> {
    Self::from_retval(unsafe { gen_random_point() })
  }

  pub fn is_valid(&self) -> bool {
    unsafe { is_valid_point(self.obj.as_ptr()) }
  }

  pub fn scalar_multiply(&self, n: &Scalar) -> Self {
    let blsct_point = unsafe {
      // fix typo after next navio-core is released
      scalar_muliply_point(self.value(), n.value())
    };
    let obj = BlsctObj::from_c_obj(blsct_point);
    obj.into()
  }

  impl_value!(BlsctPoint);
}

impl From<BlsctObj<Point, BlsctPoint>> for Point {
  fn from(obj: BlsctObj<Point, BlsctPoint>) -> Point {
    Point { obj }
  }
}

impl From<&Scalar> for Point {
  fn from(scalar: &Scalar) -> Point {
    let blsct_scalar = unsafe { point_from_scalar(scalar.value()) };
    let obj = BlsctObj::from_c_obj(blsct_scalar);
    obj.into()
  }
}

impl BlsctSerde for Point {
  unsafe fn serialize(ptr: *const u8, _: usize) -> *const i8 {
    serialize_point(ptr as *const BlsctPoint)
  }

  unsafe fn deserialize(hex: *const i8) -> *mut BlsctRetVal {
    deserialize_point(hex)
  }
}

impl PartialEq for Point {
  fn eq(&self, other: &Self) -> bool {
    unsafe {
      are_point_equal(
        self.obj.as_ptr() as *const BlsctPoint,
        other.obj.as_ptr() as *const BlsctPoint,
      ) != 0
    }
  }
}

impl Eq for Point {}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::initializer::init;

  #[test]
  fn test_base() {
    init();
    let a = Point::base().unwrap();
    let b = Point::base().unwrap();
    assert!(a == b);
  }

  #[test]
  fn test_random() {
    init();
    let mut prev: Point = Point::base().unwrap();
    let mut dup_tolerance = 5;

    for _ in 0..1000 {
      let x = Point::random().unwrap();

      if prev == x {
        dup_tolerance -= 1;
        if dup_tolerance == 0 {
          panic!("Point.random() generated the same point too many times");
        }
      } else {
        assert!(x != prev);
        prev = x;
      }
    }
  }

  #[test]
  fn test_is_valid() {
    init();
    let x = Point::base().unwrap();
    assert!(x.is_valid());
  }

  #[test]
  fn test_from_scalar() {
    init();

    let scalar = Scalar::new(123).unwrap();
    let _ = Point::from(&scalar);
  }

  #[test]
  fn test_eq() {
    init();
    let (a, b) = {
      loop {
        let a = Point::random().unwrap();
        let b = Point::random().unwrap();
        if a != b {
          break (a, b);
        }
      }
    };
    assert!(a == a);
    assert!(a != b);
    assert!(b != a);
    assert!(b == b);
  }

  #[test]
  fn test_deser() {
    init();
    let a = Point::base().unwrap();
    let hex = bincode::serialize(&a).unwrap();
    let b = bincode::deserialize::<Point>(&hex).unwrap();
    assert_eq!(a, b);
  }
}
